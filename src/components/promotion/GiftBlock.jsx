import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import qrDefaultImg from '../../assets/figma/qr-code-default.png'
import giftSingleM from '../../assets/figma/benefit-bg/gift-single-m.png'
import giftSingleL from '../../assets/figma/benefit-bg/gift-single-l.png'
import giftDoubleM from '../../assets/figma/benefit-bg/gift-double-m.png'
import giftDoubleL from '../../assets/figma/benefit-bg/gift-double-l.png'
import giftSingleMB from '../../assets/figma/benefit-bg/gift-single-m-b.png'
import giftSingleLB from '../../assets/figma/benefit-bg/gift-single-l-b.png'
import giftDoubleMB from '../../assets/figma/benefit-bg/gift-double-m-b.png'
import giftDoubleLB from '../../assets/figma/benefit-bg/gift-double-l-b.png'
import qrDoubleM from '../../assets/figma/benefit-bg/qr-double-m.png'
import qrDoubleL from '../../assets/figma/benefit-bg/qr-double-l.png'

const GIFT_BG = {
  A: { singleM: giftSingleM, singleL: giftSingleL, doubleM: giftDoubleM, doubleL: giftDoubleL },
  B: { singleM: giftSingleMB, singleL: giftSingleLB, doubleM: giftDoubleMB, doubleL: giftDoubleLB },
}

function getGiftBg({ compact, single, design }) {
  const set = GIFT_BG[design] || GIFT_BG.A
  if (single) {
    return compact ? set.singleM : set.singleL
  }
  return compact ? set.doubleM : set.doubleL
}

export default function GiftBlock({ compact }) {
  const { lang, promotion, updatePromotion, giftQr, giftDesign, qrImage } = useAppState()
  const gift = promotion[lang].gift
  const single = !giftQr

  return (
    <div className="promo-block">
      <CategoryHeader
        title={gift.title}
        subtitle={gift.subtitle}
        compact={compact}
        onTitle={(v) =>
          updatePromotion(lang, (d) => {
            d.gift.title = v
          })
        }
        onSubtitle={(v) =>
          updatePromotion(lang, (d) => {
            d.gift.subtitle = v
          })
        }
      />
      <div className={`promo-block__row ${compact ? 'promo-block__row--m' : 'promo-block__row--l'}`}>
        <div
          className={`gift-panel ${single ? 'gift-panel--single' : ''}`}
          style={{ backgroundImage: `url(${getGiftBg({ compact, single, design: giftDesign })})` }}
        >
          <Editable
            as="p"
            multiline
            className="gift-panel__heading"
            value={gift.panel.heading}
            onChange={(v) =>
              updatePromotion(lang, (d) => {
                d.gift.panel.heading = v
              })
            }
          />
          <Editable
            as="p"
            className="gift-panel__note"
            value={gift.panel.note}
            onChange={(v) =>
              updatePromotion(lang, (d) => {
                d.gift.panel.note = v
              })
            }
          />
        </div>
        {!single && (
          <div
            className="qr-panel"
            style={{ backgroundImage: `url(${compact ? qrDoubleM : qrDoubleL})` }}
          >
            <Editable
              as="p"
              multiline
              className="qr-panel__heading"
              value={gift.qr.heading}
              onChange={(v) =>
                updatePromotion(lang, (d) => {
                  d.gift.qr.heading = v
                })
              }
            />
            <Editable
              as="p"
              multiline
              className="qr-panel__desc"
              value={gift.qr.desc}
              onChange={(v) =>
                updatePromotion(lang, (d) => {
                  d.gift.qr.desc = v
                })
              }
            />
            <Editable
              as="p"
              className="qr-panel__scan"
              value={gift.qr.scanText}
              onChange={(v) =>
                updatePromotion(lang, (d) => {
                  d.gift.qr.scanText = v
                })
              }
            />
            <div className="qr-panel__code-wrap">
              <div className="qr-panel__code">
                <img src={qrImage || qrDefaultImg} alt="QR" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
