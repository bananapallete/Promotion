import Editable from '../Editable.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function Footer() {
  const { lang, promotion, updatePromotion } = useAppState()
  const footer = promotion[lang].footer

  return (
    <div className="promo-footer">
      <Editable
        as="span"
        className="promo-footer__contact"
        value={footer.contact}
        onChange={(v) =>
          updatePromotion(lang, (d) => {
            d.footer.contact = v
          })
        }
      />
      <div className="promo-footer__info">
        <Editable
          as="span"
          value={footer.name}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.footer.name = v
            })
          }
        />
        <span className="promo-footer__sep">|</span>
        <Editable
          as="span"
          value={footer.phone}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.footer.phone = v
            })
          }
        />
        <span className="promo-footer__sep">|</span>
        <Editable
          as="span"
          value={footer.email}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.footer.email = v
            })
          }
        />
      </div>
    </div>
  )
}
