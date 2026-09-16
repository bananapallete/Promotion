import { PRODUCT_LIST, useAppState } from '../../state/AppState.jsx'
import { UI } from '../../i18n/ui.js'

const SECTION_LABELS = {
  kr: { sale: 'Sale', study: 'Study', gift: 'Gift', notice: 'Notice' },
  en: { sale: 'Sale', study: 'Study', gift: 'Gift', notice: 'Notice' },
}

export default function SectionControls() {
  const { lang, sections, toggleSection, itemCounts, setItemCount, activeProducts, toggleProduct } =
    useAppState()
  const t = UI[lang]
  const labels = SECTION_LABELS[lang]

  return (
    <div className="promo-controls no-print">
      <div className="promo-controls__group">
        {Object.keys(sections).map((key) => (
          <span key={key} className="promo-controls__section">
            <label className="switch">
              <input
                type="checkbox"
                checked={sections[key]}
                onChange={() => toggleSection(key)}
              />
              <span className="switch__track">
                <span className="switch__thumb" />
              </span>
              <span className="switch__label">{labels[key]}</span>
            </label>
            {key in itemCounts && (
              <span className="count-toggle">
                {[1, 2].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`count-toggle__btn ${itemCounts[key] === count ? 'is-active' : ''}`}
                    disabled={!sections[key]}
                    onClick={() => setItemCount(key, count)}
                  >
                    {count}
                  </button>
                ))}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="promo-controls__group">
        <span className="promo-controls__caption">{t.products}</span>
        {PRODUCT_LIST.map((code) => (
          <label key={code} className="chip-check">
            <input
              type="checkbox"
              checked={activeProducts[code]}
              onChange={() => toggleProduct(code)}
            />
            <span>{code}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
