import { getSettings, setSettings, normalizeSettings } from './store.js';

function setStatus(text, isError = false) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.style.color = isError ? '#b00020' : '#0b6e4f';
}

function renderSettings(settings) {
  document.getElementById('provider').value = settings.provider || 'anthropic';
  document.getElementById('apiKey').value = settings.apiKey || '';
  document.getElementById('customBaseUrl').value = settings.customBaseUrl || '';
  renderModelSelection(settings.model || '');
  toggleCustomBaseUrl();
}

function collectSettings() {
  const modelSelectValue = document.getElementById('modelSelect').value;
  const customModelValue = document.getElementById('customModel').value.trim();
  return normalizeSettings({
    provider: document.getElementById('provider').value,
    model: modelSelectValue === '__custom__' ? customModelValue : modelSelectValue,
    apiKey: document.getElementById('apiKey').value,
    customBaseUrl: document.getElementById('customBaseUrl').value
  });
}

function toggleCustomBaseUrl() {
  const provider = document.getElementById('provider').value;
  document.getElementById('customUrlWrap').style.display = provider === 'custom' ? 'grid' : 'none';
}

function sendRuntime(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const err = chrome.runtime.lastError;
      if (err) return reject(new Error(err.message));
      if (!response?.ok) return reject(new Error(response?.error || 'Request failed.'));
      resolve(response.data);
    });
  });
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
    if (!auto) setStatus('Add API key first.', true);
    return;
  }
  if (config.provider === 'custom' && !config.customBaseUrl) {
    if (!auto) setStatus('Custom base URL required.', true);
    return;
  }

  try {
    if (!auto) setStatus('Fetching models...');
    const models = await sendRuntime({ type: 'CB_LIST_MODELS', config });
    const selected = config.model || (models[0] || '');
    renderModelSelection(selected, models);
    if (!auto) setStatus(`Loaded ${models.length} models.`);
  } catch (error) {
    if (!auto) setStatus(error.message || 'Failed to fetch models.', true);
  }
}

function bindAutoModelFetch() {
  const provider = document.getElementById('provider');
  const key = document.getElementById('apiKey');
  const custom = document.getElementById('customBaseUrl');
  let timer = null;

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => fetchModels(true), 500);
  };

  provider.addEventListener('change', () => {
    toggleCustomBaseUrl();
    schedule();
  });
  key.addEventListener('input', schedule);
  custom.addEventListener('input', schedule);
}

async function init() {
  const settings = normalizeSettings(await getSettings());
  renderSettings(settings);
  bindAutoModelFetch();
  document.getElementById('modelSelect').addEventListener('change', toggleCustomModelField);

  document.getElementById('fetchModelsBtn').addEventListener('click', () => fetchModels(false));

  document.getElementById('saveBtn').addEventListener('click', async () => {
    try {
      const next = collectSettings();
      if (!next.apiKey) return setStatus('API key is required.', true);
      if (!next.model) return setStatus('Model is required.', true);
      if (next.provider === 'custom' && !next.customBaseUrl) return setStatus('Custom base URL is required.', true);
      await setSettings(next);
      setStatus('Settings saved.');
    } catch (error) {
      setStatus(error.message || 'Failed to save settings.', true);
    }
  });

  await fetchModels(true);
}

init();
