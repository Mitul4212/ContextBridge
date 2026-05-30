import { normalizeGeminiModel } from './summarizer.js';

function normalizeList(list) {
  return Array.from(new Set((list || []).map((s) => (s || '').trim()).filter(Boolean))).sort();
}

function toOpenAIModelsUrl(chatCompletionsUrl) {
  const url = (chatCompletionsUrl || '').trim();
  if (!url) return '';
  return url.replace(/\/chat\/completions\/?$/i, '/models');
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return JSON.parse(text);
}

async function listOpenAICompatible(config) {
  const url = config.provider === 'openai'
    ? 'https://api.openai.com/v1/models'
    : config.provider === 'groq'
      ? 'https://api.groq.com/openai/v1/models'
      : toOpenAIModelsUrl(config.customBaseUrl);

  if (!url) throw new Error('Missing models URL for custom provider. Use a /chat/completions URL.');

  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${config.apiKey}` }
  });

  return normalizeList((data?.data || []).map((m) => m?.id));
}

async function listGemini(config) {
  const data = await fetchJson('https://generativelanguage.googleapis.com/v1beta/models', {
    headers: { 'x-goog-api-key': config.apiKey }
  });

  return normalizeList((data?.models || []).map((m) => normalizeGeminiModel(m?.name || '')));
}

async function listAnthropic(config) {
  const data = await fetchJson('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    }
  });

  return normalizeList((data?.data || []).map((m) => m?.id));
}

export async function listModelsForProvider(config) {
  if (!config?.provider) throw new Error('Provider is required.');
  if (!config?.apiKey) throw new Error('API key is required.');

  if (config.provider === 'gemini') return listGemini(config);
  if (config.provider === 'anthropic') return listAnthropic(config);
  return listOpenAICompatible(config);
}
