import { useAppState } from '../state/AppState.jsx'
import { UI } from '../i18n/ui.js'

export default function TopBar() {
  const { theme, lang, toggleTheme, toggleLang, resetAll } = useAppState()
  const t = UI[lang]

  const handleReset = () => {
    if (window.confirm(t.resetConfirm)) resetAll()
  }

  const handlePrint = () => {
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
        <button
          type="button"
          className="topbar__btn topbar__btn--theme"
          onClick={toggleTheme}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? `☀️ ${t.lightMode}` : `🌙 ${t.darkMode}`}
        </button>
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
