import Editable from '../Editable.jsx'
import { PRODUCT_LIST, useAppState } from '../../state/AppState.jsx'

export default function Header() {
  const { lang, promotion, updatePromotion, activeProducts } = useAppState()
  const content = promotion[lang]
  const titleLines =
    lang === 'kr'
      ? ['마이다스 26주년', '고객 감사 프로모션']
      : ['MIDAS 26th Anniversary Special Promotion', 'Customer Appreciation Promotion']

  const activeCodes = PRODUCT_LIST.filter((code) => activeProducts[code])

  return (
    <div className="promo-header" data-lang={lang}>
      <div className="promo-header__glow" aria-hidden="true" />
      <div className="promo-header__title">
        <p className="promo-header__title-line1">{titleLines[0]}</p>
        <p className="promo-header__title-line2">{titleLines[1]}</p>
      </div>
      <div className="promo-header__meta">
        <div className="promo-header__row">
          <span className="promo-header__pill">
            <Editable
              value={content.header.label}
              onChange={(v) =>
                updatePromotion(lang, (draft) => {
                  draft.header.label = v
                })
              }
              ariaLabel="Header label"
            />
          </span>
          <span className="promo-header__date">
            <Editable
              value={content.header.date}
              onChange={(v) =>
                updatePromotion(lang, (draft) => {
                  draft.header.date = v
                })
              }
              ariaLabel="Header date"
            />
          </span>
        </div>
        <div className="promo-header__products">
          {activeCodes.map((code) => (
            <span key={code} className="product-badge">
              {code}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
