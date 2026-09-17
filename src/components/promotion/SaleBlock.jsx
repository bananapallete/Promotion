import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import saleSingleMGold from '../../assets/figma/benefit-bg/sale-single-m-gold.png'
import saleSingleLGold from '../../assets/figma/benefit-bg/sale-single-l-gold.png'
import saleSingleMSilver from '../../assets/figma/benefit-bg/sale-single-m-silver.png'
import saleSingleLSilver from '../../assets/figma/benefit-bg/sale-single-l-silver.png'
import saleDoubleMGold from '../../assets/figma/benefit-bg/sale-double-m-gold.png'
import saleDoubleMSilver from '../../assets/figma/benefit-bg/sale-double-m-silver.png'
import saleDoubleLGold from '../../assets/figma/benefit-bg/sale-double-l-gold.png'
import saleDoubleLSilver from '../../assets/figma/benefit-bg/sale-double-l-silver.png'

function getSaleBg({ badge, compact, single }) {
  if (single) {
    if (badge === 'silver') {
      return compact ? saleSingleMSilver : saleSingleLSilver
    }
    return compact ? saleSingleMGold : saleSingleLGold
  }
  if (badge === 'silver') {
    return compact ? saleDoubleMSilver : saleDoubleLSilver
  }
  return compact ? saleDoubleMGold : saleDoubleLGold
}

function SaleBox({ data, badge, compact, single, onHeading, onPercent, onDesc }) {
  const bg = getSaleBg({ badge, compact, single })
  return (
    <div
      className={`benefit-box ${compact ? 'benefit-box--m' : 'benefit-box--l'} ${
        single ? 'benefit-box--single' : ''
      }`}
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Editable
        as="p"
        multiline
        className="benefit-box__heading"
        value={single ? data.headingL : data.headingM}
        onChange={onHeading}
      />
      <div
        className={`benefit-badge benefit-badge--${badge} benefit-badge--${single ? '1' : '2'}${
          compact ? 'm' : 'l'
        }`}
      >
        <span className="benefit-badge__up">Up to</span>
        <span className="benefit-badge__pct">
          <Editable
            as="span"
            className="benefit-badge__pct-input benefit-badge__pct-num"
            value={data.percent}
            onChange={onPercent}
          />
          <span className="benefit-badge__pct-sign">%</span>
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

export default function SaleBlock({ compact, single, keepSide = 'left' }) {
  const { lang, promotion, updatePromotion } = useAppState()
  const sale = promotion[lang].sale
  const showBox1 = !single || keepSide !== 'right'
  const showBox2 = !single || keepSide === 'right'

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
        {showBox1 && (
          <SaleBox
            data={sale.box1}
            badge="gold"
            compact={compact}
            single={single}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.sale.box1[single ? 'headingL' : 'headingM'] = v
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
        )}
        {showBox2 && (
          <SaleBox
            data={sale.box2}
            badge="silver"
            compact={compact}
            single={single}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.sale.box2[single ? 'headingL' : 'headingM'] = v
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
