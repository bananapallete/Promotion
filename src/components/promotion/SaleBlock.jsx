import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'

function SaleBox({ data, badge, compact, single, onHeading, onPercent, onDesc }) {
  return (
    <div
      className={`benefit-box ${compact ? 'benefit-box--m' : 'benefit-box--l'} ${
        single ? 'benefit-box--single' : ''
      }`}
    >
      <div className={`benefit-box__glow benefit-box__glow--${badge}`} aria-hidden="true" />
      <Editable
        as="p"
        multiline
        className="benefit-box__heading"
        value={data.heading}
        onChange={onHeading}
      />
      <div className={`benefit-badge benefit-badge--${badge} ${single ? 'benefit-badge--single' : ''}`}>
        <span className="benefit-badge__up">Up to</span>
        <span className="benefit-badge__pct">
          <Editable
            as="span"
            className="benefit-badge__pct-input"
            value={data.percent}
            onChange={onPercent}
          />
          %
        </span>
      </div>
      <Editable
        as="p"
        multiline
        className="benefit-box__desc"
        value={data.desc}
        onChange={onDesc}
      />
    </div>
  )
}

export default function SaleBlock({ compact, single }) {
  const { lang, promotion, updatePromotion } = useAppState()
  const sale = promotion[lang].sale

  return (
    <div className="promo-block">
      <CategoryHeader
        title={sale.title}
        subtitle={sale.subtitle}
        compact={compact}
        onTitle={(v) =>
          updatePromotion(lang, (d) => {
            d.sale.title = v
          })
        }
        onSubtitle={(v) =>
          updatePromotion(lang, (d) => {
            d.sale.subtitle = v
          })
        }
      />
      <div className={`promo-block__row ${compact ? 'promo-block__row--m' : 'promo-block__row--l'}`}>
        <SaleBox
          data={sale.box1}
          badge="gold"
          compact={compact}
          single={single}
          onHeading={(v) =>
            updatePromotion(lang, (d) => {
              d.sale.box1.heading = v
            })
          }
          onPercent={(v) =>
            updatePromotion(lang, (d) => {
              d.sale.box1.percent = v
            })
          }
          onDesc={(v) =>
            updatePromotion(lang, (d) => {
              d.sale.box1.desc = v
            })
          }
        />
        {!single && (
          <SaleBox
            data={sale.box2}
            badge="silver"
            compact={compact}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.sale.box2.heading = v
              })
            }
            onPercent={(v) =>
              updatePromotion(lang, (d) => {
                d.sale.box2.percent = v
              })
            }
            onDesc={(v) =>
              updatePromotion(lang, (d) => {
                d.sale.box2.desc = v
              })
            }
          />
        )}
      </div>
    </div>
  )
}
