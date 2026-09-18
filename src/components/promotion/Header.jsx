import Editable from '../Editable.jsx'
import { PRODUCT_LIST, useAppState } from '../../state/AppState.jsx'
import headerBgImg from '../../assets/figma/header-bg.png'
import headerGiftImg from '../../assets/figma/header-gift-accent.png'
import headerLeafImg from '../../assets/figma/header-leaf.svg'
import civilIcon from '../../assets/figma/products/civil.svg'
import genIcon from '../../assets/figma/products/gen.svg'
import gtsIcon from '../../assets/figma/products/gts.svg'
import swsIcon from '../../assets/figma/products/sws.svg'
import gxdIcon from '../../assets/figma/products/gxd.svg'

const PRODUCT_ICONS = { CIVIL: civilIcon, GEN: genIcon, GTS: gtsIcon, SWS: swsIcon, GXD: gxdIcon }

export default function Header() {
  const { lang, promotion, updatePromotion, activeProducts } = useAppState()
  const content = promotion[lang]

  const activeCodes = PRODUCT_LIST.filter((code) => activeProducts[code])

  return (
    <div className="promo-header" data-lang={lang}>
      <div
        className="promo-header__bg"
        style={{ backgroundImage: `url(${headerBgImg})` }}
        aria-hidden="true"
      />
      <div
        className="promo-header__gift"
        style={{ backgroundImage: `url(${headerGiftImg})` }}
        aria-hidden="true"
      />
      <div className="promo-header__content">
        <div className="promo-header__eyebrow-row">
          <img className="promo-header__leaf" src={headerLeafImg} alt="" aria-hidden="true" />
          <Editable
            as="span"
            className="promo-header__eyebrow"
            value={content.header.eyebrow}
            onChange={(v) =>
              updatePromotion(lang, (draft) => {
                draft.header.eyebrow = v
              })
            }
            ariaLabel="Header eyebrow"
          />
          <img
            className="promo-header__leaf promo-header__leaf--right"
            src={headerLeafImg}
            alt=""
            aria-hidden="true"
          />
        </div>
        <Editable
          as="p"
          multiline
          className="promo-header__title"
          value={content.header.title}
          onChange={(v) =>
            updatePromotion(lang, (draft) => {
              draft.header.title = v
            })
          }
          ariaLabel="Header title"
        />
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
    </div>
  )
}
