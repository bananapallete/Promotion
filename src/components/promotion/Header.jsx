import Editable from '../Editable.jsx'
import { PRODUCT_LIST, useAppState } from '../../state/AppState.jsx'
import headerFlatLightImg from '../../assets/figma/header-flat-light.png'
import headerFlatDarkImg from '../../assets/figma/header-flat-dark.png'
import headerFlatEnImg from '../../assets/figma/header-flat-en.png'
import civilIcon from '../../assets/figma/products/civil.svg'
import genIcon from '../../assets/figma/products/gen.svg'
import gtsIcon from '../../assets/figma/products/gts.svg'
import swsIcon from '../../assets/figma/products/sws.svg'
import gxdIcon from '../../assets/figma/products/gxd.svg'

const PRODUCT_ICONS = { CIVIL: civilIcon, GEN: genIcon, GTS: gtsIcon, SWS: swsIcon, GXD: gxdIcon }

export default function Header() {
  const { lang, theme, promotion, updatePromotion, activeProducts } = useAppState()
  const content = promotion[lang]

  const activeCodes = PRODUCT_LIST.filter((code) => activeProducts[code])

  const flatSrc =
    lang === 'kr' ? (theme === 'dark' ? headerFlatDarkImg : headerFlatLightImg) : headerFlatEnImg

  return (
    <div className="promo-header" data-lang={lang}>
      <img className="promo-header__flat-bg" src={flatSrc} alt="" aria-hidden="true" />
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
              <img src={PRODUCT_ICONS[code]} alt={code} />
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
