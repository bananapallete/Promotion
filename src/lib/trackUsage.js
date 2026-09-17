const SHEET_LOG_URL = import.meta.env.VITE_SHEET_LOG_URL

export function logPrintEvent() {
  if (!SHEET_LOG_URL) return

  try {
    fetch(SHEET_LOG_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ timestamp: new Date().toISOString() }),
    }).catch(() => {})
  } catch {
    // ignore — logging must never block printing
  }
}
