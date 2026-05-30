const SESSIONS_KEY = 'contextbridge.sessions';
const MAX_SESSIONS = 30;

export async function listSessions() {
  const data = await chrome.storage.local.get(SESSIONS_KEY);
  return data[SESSIONS_KEY] || [];
}

export async function saveSession(session) {
  const sessions = await listSessions();
  const record = { id: crypto.randomUUID(), createdAt: Date.now(), ...session };
  const next = [record, ...sessions].slice(0, MAX_SESSIONS);
  await chrome.storage.local.set({ [SESSIONS_KEY]: next });
  return record;
}

export async function getLatestSession() {
  const sessions = await listSessions();
  return sessions[0] || null;
}

export async function getSessionById(id) {
  const sessions = await listSessions();
  return sessions.find((s) => s.id === id) || null;
}

export async function clearSessions() {
  await chrome.storage.local.set({ [SESSIONS_KEY]: [] });
}
