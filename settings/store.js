const SETTINGS_KEY = 'contextbridge.settings';

export async function getSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return data[SETTINGS_KEY] || {};
}

export async function setSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export function normalizeSettings(input) {
  return {
    provider: input.provider || 'anthropic',
    model: (input.model || '').trim(),
    apiKey: (input.apiKey || '').trim(),
    customBaseUrl: (input.customBaseUrl || '').trim()
  };
}
