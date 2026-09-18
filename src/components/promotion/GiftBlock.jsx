import { useRef } from 'react'
import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import { UI } from '../../i18n/ui.js'
import qrDefaultImg from '../../assets/figma/qr-code.svg'
import giftSingleM from '../../assets/figma/benefit-bg/gift-single-m.png'
import giftSingleL from '../../assets/figma/benefit-bg/gift-single-l.png'
import giftDoubleM from '../../assets/figma/benefit-bg/gift-double-m.png'
import giftDoubleL from '../../assets/figma/benefit-bg/gift-double-l.png'
import qrDoubleM from '../../assets/figma/benefit-bg/qr-double-m.png'
import qrDoubleL from '../../assets/figma/benefit-bg/qr-double-l.png'

// Design B reuses design A's artwork as a placeholder until its own
// backgrounds are provided — swap these four imports for the real assets.
const GIFT_BG = {
  A: { singleM: giftSingleM, singleL: giftSingleL, doubleM: giftDoubleM, doubleL: giftDoubleL },
  B: { singleM: giftSingleM, singleL: giftSingleL, doubleM: giftDoubleM, doubleL: giftDoubleL },
}

function getGiftBg({ compact, single, design }) {
  const set = GIFT_BG[design] || GIFT_BG.A
  if (single) {
    return compact ? set.singleM : set.singleL
  }
  return compact ? set.doubleM : set.doubleL
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function GiftBlock({ compact }) {
  const { lang, promotion, updatePromotion, qrImage, setQrImage, giftQr, giftDesign } =
    useAppState()
  const t = UI[lang]
  const gift = promotion[lang].gift
  const qrInputRef = useRef(null)
  const single = !giftQr

  const handleQrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setQrImage(await readFileAsDataUrl(file))
  }

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
              <button
                type="button"
                className="ghost-btn no-print qr-panel__upload-btn"
                onClick={() => qrInputRef.current?.click()}
              >
                {t.uploadQr}
              </button>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                onChange={handleQrFile}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
