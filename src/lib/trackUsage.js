const SHEET_LOG_URL = import.meta.env.VITE_SHEET_LOG_URL

function logEvent(type) {
  if (!SHEET_LOG_URL) return

  try {
    fetch(SHEET_LOG_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ type, timestamp: new Date().toISOString() }),
    }).catch(() => {})
  } catch {
    // ignore — logging must never block the UI
  }
}

export function logVisitEvent() {
  logEvent('visit')
}

export function logPrintEvent() {
  logEvent('print')
}
