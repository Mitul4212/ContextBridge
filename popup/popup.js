function setStatus(text, isError = false, id = 'status') {
  const status = document.getElementById(id);
  status.textContent = text;
  status.className = `status ${isError ? 'err' : 'ok'}`;
}

function sendRuntime(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!response?.ok) return reject(new Error(response?.error || 'Extension action failed.'));
      resolve(response.data);
    });
  });
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${name}`));
}

function getTarget() {
  return document.getElementById('exportTarget').value;
}

function collectSettings() {
  const modelSelectValue = document.getElementById('modelSelect').value;
  const customModelValue = document.getElementById('customModel').value.trim();
  return {
    provider: document.getElementById('provider').value,
    model: modelSelectValue === '__custom__' ? customModelValue : modelSelectValue,
    apiKey: document.getElementById('apiKey').value.trim(),
    customBaseUrl: document.getElementById('customBaseUrl').value.trim()
  };
}

function renderSettings(settings) {
  document.getElementById('provider').value = settings.provider || 'anthropic';
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('customBaseUrl').value = settings.customBaseUrl || '';
  renderModelSelection(settings.model || '');
  toggleCustomField();
}

function toggleCustomField() {
  const provider = document.getElementById('provider').value;
  document.getElementById('customUrlWrap').style.display = provider === 'custom' ? 'grid' : 'none';
}

function renderModelSelection(selectedModel = '', models = null) {
  const select = document.getElementById('modelSelect');
  const custom = document.getElementById('customModel');
  if (Array.isArray(models)) {
    select.innerHTML = '';
    const base = [
      { value: '', label: 'Select model' },
      { value: '__custom__', label: 'Custom model (type below)' }
    ];
    for (const entry of base) {
      const opt = document.createElement('option');
      opt.value = entry.value;
      opt.textContent = entry.label;
      select.appendChild(opt);
    }
    for (const model of models) {
      const opt = document.createElement('option');
      opt.value = model;
      opt.textContent = model;
      select.appendChild(opt);
    }
  }

  const hasExact = selectedModel && [...select.options].some((o) => o.value === selectedModel);
  if (hasExact) {
    select.value = selectedModel;
    custom.value = '';
  } else if (selectedModel) {
    select.value = '__custom__';
    custom.value = selectedModel;
  } else if (!select.value) {
    select.value = '';
  }
  toggleCustomModelField();
}

function toggleCustomModelField() {
  const show = document.getElementById('modelSelect').value === '__custom__';
  document.getElementById('customModelWrap').style.display = show ? 'grid' : 'none';
}

async function fetchModels(auto = false) {
  const config = collectSettings();
  if (!config.apiKey) {
    if (!auto) setStatus('Add API key first.', true, 'settingsStatus');
    return;
  }
  if (config.provider === 'custom' && !config.customBaseUrl) {
    if (!auto) setStatus('Custom base URL required.', true, 'settingsStatus');
    return;
  }

  try {
    if (!auto) setStatus('Fetching models...', false, 'settingsStatus');
    const models = await sendRuntime({ type: 'CB_LIST_MODELS', config });
    const selected = config.model || (models[0] || '');
    renderModelSelection(selected, models);
    if (!auto) setStatus(`Loaded ${models.length} models.`, false, 'settingsStatus');
  } catch (error) {
    if (!auto) setStatus(error.message || 'Failed to fetch models.', true, 'settingsStatus');
  }
}

async function saveSettings() {
  const config = collectSettings();
  if (!config.apiKey) return setStatus('API key is required.', true, 'settingsStatus');
  if (!config.model) return setStatus('Model is required.', true, 'settingsStatus');
  if (config.provider === 'custom' && !config.customBaseUrl) return setStatus('Custom URL is required.', true, 'settingsStatus');

  await sendRuntime({ type: 'CB_SAVE_SETTINGS', config });
  setStatus('Settings saved.', false, 'settingsStatus');
}

async function saveSession() {
  setStatus('Saving and summarizing chat...');
  const data = await sendRuntime({ type: 'CB_SAVE_SESSION' });
  setStatus(`Saved (${data.platform}).`);
  await loadHistory();
}

async function copyExport() {
  const target = getTarget();
  setStatus(`Preparing ${target} export...`);
  const data = await sendRuntime({ type: 'CB_GET_EXPORT', target });
  await navigator.clipboard.writeText(data.text);
  setStatus(`${data.target} copied.`);
}

async function downloadExport() {
  const target = getTarget();
  setStatus(`Preparing ${target} export...`);
  const data = await sendRuntime({ type: 'CB_GET_EXPORT', target });
  const blob = new Blob([data.text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await chrome.downloads.download({ url, filename: `contextbridge-${target}-${stamp}.md`, saveAs: true });
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  setStatus(`${data.target} downloaded.`);
}

async function injectLatest() {
  const target = getTarget();
  setStatus(`Injecting ${target} context...`);
  const data = await sendRuntime({ type: 'CB_INJECT_LATEST', target });
  setStatus(`Injected ${data.target}.`);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString();
}

async function loadHistory() {
  const sessions = await sendRuntime({ type: 'CB_LIST_SESSIONS' });
  const select = document.getElementById('sessionSelect');
  const list = document.getElementById('historyList');
  select.innerHTML = '';
  list.innerHTML = '';

  if (!sessions.length) {
    const div = document.createElement('div');
    div.className = 'session-item';
    div.textContent = 'No sessions yet.';
    list.appendChild(div);
    document.getElementById('historyPreview').value = '';
    return;
  }

  for (const s of sessions) {
    const option = document.createElement('option');
    option.value = s.id;
    option.textContent = `${s.platform || 'unknown'} - ${formatDate(s.createdAt)}`;
    select.appendChild(option);

    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `<div><strong>${s.platform || 'unknown'}</strong></div><div class="meta">${formatDate(s.createdAt)}</div>`;
    list.appendChild(item);
  }

  await loadSelectedSessionPreview();
}

async function loadSelectedSessionPreview() {
  const id = document.getElementById('sessionSelect').value;
  if (!id) return;
  const session = await sendRuntime({ type: 'CB_GET_SESSION', id });
  document.getElementById('historyPreview').value = session.masterFile || '';
}

async function copySelectedFromHistory() {
  const preview = document.getElementById('historyPreview').value;
  if (!preview) return setStatus('No history item selected.', true);
  await navigator.clipboard.writeText(preview);
  setStatus('Selected history memory copied.');
}

async function saveSessionEdit() {
  const id = document.getElementById('sessionSelect').value;
  if (!id) return setStatus('No session selected.', true, 'historyStatus');
  const masterFile = document.getElementById('historyPreview').value.trim();
  if (!masterFile) return setStatus('Memory file is empty.', true, 'historyStatus');
  setStatus('Saving edits...', false, 'historyStatus');
  await sendRuntime({ type: 'CB_UPDATE_SESSION', id, masterFile });
  setStatus('Edits saved. Exports regenerated.', false, 'historyStatus');
}

function bindAction(id, fn, statusId = 'status') {
  document.getElementById(id).addEventListener('click', async () => {
    try {
      await fn();
    } catch (error) {
      setStatus(error.message || 'Action failed.', true, statusId);
    }
  });
}

function bindAutoModelFetch() {
  const provider = document.getElementById('provider');
  const key = document.getElementById('apiKey');
  const custom = document.getElementById('customBaseUrl');
  let timer = null;

  const kick = () => {
    clearTimeout(timer);
    timer = setTimeout(() => fetchModels(true), 500);
  };

  provider.addEventListener('change', () => {
    toggleCustomField();
    kick();
  });
  key.addEventListener('input', kick);
  custom.addEventListener('input', kick);
}

async function init() {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  const settings = await sendRuntime({ type: 'CB_GET_SETTINGS' });
  renderSettings(settings);

  bindAutoModelFetch();
  document.getElementById('modelSelect').addEventListener('change', toggleCustomModelField);
  bindAction('fetchModelsBtn', () => fetchModels(false), 'settingsStatus');
  bindAction('saveSettingsBtn', saveSettings, 'settingsStatus');

  bindAction('saveSessionBtn', saveSession);
  bindAction('copyExportBtn', copyExport);
  bindAction('downloadExportBtn', downloadExport);
  bindAction('injectBtn', injectLatest);

  bindAction('refreshHistoryBtn', loadHistory);
  bindAction('copyFromHistoryBtn', copySelectedFromHistory);
  bindAction('saveEditBtn', saveSessionEdit, 'historyStatus');
  document.getElementById('sessionSelect').addEventListener('change', loadSelectedSessionPreview);

  await fetchModels(true);
  await loadHistory();
  setStatus('Ready.');
}

init();
