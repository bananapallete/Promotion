import { useRef } from 'react'
import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import { UI } from '../../i18n/ui.js'

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function GiftBlock({ compact }) {
  const { lang, promotion, updatePromotion, giftImage, qrImage, setGiftImage, setQrImage } =
    useAppState()
  const t = UI[lang]
  const gift = promotion[lang].gift
  const giftInputRef = useRef(null)
  const qrInputRef = useRef(null)

  const handleGiftUploadClick = () => {
    if (window.confirm(t.giftConfirm)) {
      giftInputRef.current?.click()
    }
  }

  const handleGiftFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setGiftImage(await readFileAsDataUrl(file))
  }

  const handleQrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setQrImage(await readFileAsDataUrl(file))
  }

  return (
    <div className={`promo-block promo-block--gift ${compact ? 'promo-block--gift-m' : 'promo-block--gift-l'}`}>
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
      <div className="promo-block__row promo-block__row--fill">
        <div className="gift-panel">
          <div className="gift-panel__glow" aria-hidden="true" />
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
          <div className="gift-panel__image">
            {giftImage ? (
              <img src={giftImage} alt="gift" />
            ) : (
              <span className="gift-panel__image-placeholder">🎁</span>
            )}
            <button
              type="button"
              className="ghost-btn no-print"
              onClick={handleGiftUploadClick}
            >
              {t.uploadGift}
            </button>
            <input
              ref={giftInputRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={handleGiftFile}
            />
          </div>
        </div>
        <div className="qr-panel">
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
              {qrImage ? (
                <img src={qrImage} alt="QR" />
              ) : (
                <span className="qr-panel__code-placeholder" aria-hidden="true">
                  ▦
                </span>
              )}
            </div>
            <button
              type="button"
              className="ghost-btn ghost-btn--light no-print qr-panel__upload-btn"
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
      </div>
      <NoticeBlock lang={lang} />
    </div>
  )
}

function NoticeBlock({ lang }) {
  const { promotion, updatePromotion } = useAppState()
  const notice = promotion[lang].notice

  return (
    <div className="notice-block">
      <Editable
        as="p"
        className="notice-block__title"
        value={notice.title}
        onChange={(v) =>
          updatePromotion(lang, (d) => {
            d.notice.title = v
          })
        }
      />
      <div className="notice-block__cols">
        <Editable
          as="p"
          multiline
          className="notice-block__col"
          value={notice.col1}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.notice.col1 = v
            })
          }
        />
        <Editable
          as="p"
          multiline
          className="notice-block__col"
          value={notice.col2}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.notice.col2 = v
            })
          }
        />
      </div>
    </div>
  )
}
