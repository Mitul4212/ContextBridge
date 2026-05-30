function ensureOk(response, bodyText) {
  if (!response.ok) {
    const preview = bodyText.slice(0, 400);
    if (response.status === 504 || response.status === 502 || response.status === 503) {
      throw new Error(`API gateway timeout (${response.status}). The custom endpoint did not respond in time. Check that the base URL is correct and the server is running.`);
    }
    throw new Error(`API request failed (${response.status}): ${preview}`);
  }
}

function getOpenAIUrl(provider, customBaseUrl) {
  if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions';
  if (provider === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';
  if (provider === 'custom') return customBaseUrl;
  return '';
}

function normalizeGeminiModel(model) {
  const raw = (model || '').trim();
  if (!raw) return raw;
  return raw.startsWith('models/') ? raw.slice('models/'.length) : raw;
}

async function fetchWithTimeout(url, options, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s. The custom endpoint is too slow or unreachable.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAICompatible(config, promptText) {
  const url = getOpenAIUrl(config.provider, config.customBaseUrl);
  if (!url) throw new Error('Missing API URL for provider.');

  const payload = {
    model: config.model,
    messages: [{ role: 'user', content: promptText }],
    temperature: 0.2
  };

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(payload)
  }, 90000);

  const text = await response.text();
  ensureOk(response, text);

  const data = JSON.parse(text);
  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic(config, promptText) {
  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 7000,
      temperature: 0.2,
      messages: [{ role: 'user', content: promptText }]
    })
  }, 90000);

  const text = await response.text();
  ensureOk(response, text);

  const data = JSON.parse(text);
  const blocks = data?.content || [];
  return blocks.map((b) => b?.text || '').join('\n').trim();
}

async function callGemini(config, promptText) {
  const model = normalizeGeminiModel(config.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 7000 }
    })
  }, 90000);

  const text = await response.text();
  ensureOk(response, text);

  const data = JSON.parse(text);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p?.text || '').join('\n').trim();
}

function validateConfig(config) {
  if (!config?.provider) throw new Error('Missing provider in settings.');
  if (!config?.model) throw new Error('Missing model in settings.');
  if (!config?.apiKey) throw new Error('Missing API key in settings.');
  if (config.provider === 'custom' && !config.customBaseUrl) {
    throw new Error('Custom provider needs a base URL.');
  }
}

export async function summarizeWithProvider(config, promptText) {
  validateConfig(config);

  if (config.provider === 'anthropic') {
    return callAnthropic(config, promptText);
  }

  if (config.provider === 'gemini') {
    return callGemini(config, promptText);
  }

  return callOpenAICompatible(config, promptText);
}

export { normalizeGeminiModel };

