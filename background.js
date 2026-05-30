import { summarizeWithProvider } from './api/summarizer.js';
import { listModelsForProvider } from './api/models.js';
import { buildMasterPrompt, buildFidelityPatchPrompt, buildSectionCompletionPrompt, formatForTarget, EXPORT_TARGETS } from './export/formatter.js';
import { getSettings, normalizeSettings, setSettings } from './settings/store.js';
import { saveSession, getLatestSession, listSessions, getSessionById } from './storage/sessions.js';

function sendToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      resolve(response);
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function createHighFidelityMaster(settings, transcript) {
  const firstPass = await summarizeWithProvider(settings, buildMasterPrompt(transcript));
  if (!firstPass?.trim()) throw new Error('Summarization returned empty output.');

  let candidate = firstPass;
  try {
    const secondPass = await summarizeWithProvider(settings, buildFidelityPatchPrompt(transcript, firstPass));
    candidate = secondPass?.trim() || firstPass;
  } catch (_error) {
    candidate = firstPass;
  }

  try {
    const completed = await summarizeWithProvider(settings, buildSectionCompletionPrompt(transcript, candidate));
    candidate = completed?.trim() || candidate;
  } catch (_error) {
    return candidate;
  }

  return candidate;
}

async function saveCurrentSession() {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab found.');

  const scraped = await sendToTab(tab.id, { type: 'CB_SCRAPE_CHAT' });
  if (!scraped?.ok) throw new Error(scraped?.error || 'Could not scrape chat from page.');

  const transcript = (scraped.data?.transcript || '').trim();
  if (!transcript) throw new Error('No chat content found on page. Open a supported chat thread first.');

  const settings = normalizeSettings(await getSettings());
  const masterFile = await createHighFidelityMaster(settings, transcript);

  const exports = {};
  for (const target of EXPORT_TARGETS) {
    exports[target] = formatForTarget(masterFile, target);
  }

  const record = await saveSession({
    sourceUrl: tab.url || '',
    platform: scraped.data.platform,
    transcript,
    masterFile,
    exports
  });

  return {
    id: record.id,
    platform: record.platform,
    sourceUrl: record.sourceUrl,
    createdAt: record.createdAt,
    masterFile,
    exports
  };
}

async function getExportText(target) {
  const session = await getLatestSession();
  if (!session) throw new Error('No saved sessions yet. Click Save Session first.');
  const selected = EXPORT_TARGETS.includes(target) ? target : 'universal';
  return { target: selected, text: session.exports?.[selected] || formatForTarget(session.masterFile || '', selected) };
}

async function injectLatest(target) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error('No active tab found for injection.');
  const payload = await getExportText(target);

  const response = await sendToTab(tab.id, { type: 'CB_INJECT_CONTEXT', text: payload.text });
  if (!response?.ok) throw new Error(response?.error || 'Failed to inject context.');
  return { ok: true, target: payload.target };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (!message?.type) throw new Error('Missing message type.');

    if (message.type === 'CB_SAVE_SESSION') return { ok: true, data: await saveCurrentSession() };
    if (message.type === 'CB_GET_EXPORT') return { ok: true, data: await getExportText(message.target) };
    if (message.type === 'CB_INJECT_LATEST') return { ok: true, data: await injectLatest(message.target) };
    if (message.type === 'CB_LIST_SESSIONS') return { ok: true, data: await listSessions() };
    if (message.type === 'CB_GET_SESSION') {
      const session = await getSessionById(message.id);
      if (!session) throw new Error('Session not found.');
      return { ok: true, data: session };
    }
    if (message.type === 'CB_LIST_MODELS') return { ok: true, data: await listModelsForProvider(normalizeSettings(message.config || {})) };
    if (message.type === 'CB_GET_SETTINGS') return { ok: true, data: normalizeSettings(await getSettings()) };
    if (message.type === 'CB_SAVE_SETTINGS') {
      const next = normalizeSettings(message.config || {});
      await setSettings(next);
      return { ok: true, data: next };
    }
    if (message.type === 'CB_PING') return { ok: true, data: { ready: true } };

    throw new Error(`Unknown message type: ${message.type}`);
  })().then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message || 'Unexpected error.' }));

  return true;
});
