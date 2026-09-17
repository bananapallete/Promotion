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
    <div className="promo-rail no-print">
      <div className="promo-rail__card">
        <p className="promo-rail__card-title">{t.products}</p>
        <p className="promo-rail__card-desc">{t.productsHint}</p>
        <div className="promo-rail__chips">
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

      {Object.keys(sections).map((key) => (
        <div key={key} className={`promo-rail__card ${sections[key] ? '' : 'promo-rail__card--off'}`}>
          <div className="promo-rail__card-head">
            <label className="switch">
              <input type="checkbox" checked={sections[key]} onChange={() => toggleSection(key)} />
              <span className="switch__track">
                <span className="switch__thumb" />
              </span>
              <span className="switch__label">{labels[key]}</span>
            </label>
          </div>
          <p className="promo-rail__card-desc">{t.sectionDesc[key]}</p>
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
        </div>
      ))}
    </div>
  )
}
