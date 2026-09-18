import { useAppState } from '../state/AppState.jsx'
import { UI } from '../i18n/ui.js'
import { logPrintEvent } from '../lib/trackUsage.js'

export default function TopBar() {
  const { theme, lang, toggleTheme, toggleLang, resetAll } = useAppState()
  const t = UI[lang]

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) resetAll()
  }

  const handlePrint = () => {
    logPrintEvent()
    window.print()
  }

  return (
    <header className="topbar no-print">
      <div className="topbar__brand">
        <span className="topbar__logo" aria-hidden="true">
          M
        </span>
        <span className="topbar__title">{t.brand}</span>
      </div>
      <div className="topbar__actions">
        <button type="button" className="topbar__btn" onClick={toggleLang}>
          {t.langToggle}
        </button>
        <label className="switch topbar__theme-switch">
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
          <span className="switch__label">{theme === 'dark' ? t.darkMode : t.lightMode}</span>
        </label>
        <button type="button" className="topbar__btn" onClick={handleReset}>
          {t.reset}
        </button>
        <button type="button" className="topbar__btn topbar__btn--primary" onClick={handlePrint}>
          {t.print}
        </button>
      </div>
    </header>
  )
}
