import { useRef } from 'react'
import { PRODUCT_LIST, useAppState } from '../../state/AppState.jsx'
import { UI } from '../../i18n/ui.js'

const SECTION_LABELS = {
  kr: { sale: 'Sale', study: 'Study', gift: 'Gift', notice: 'Notice' },
  en: { sale: 'Sale', study: 'Study', gift: 'Gift', notice: 'Notice' },
}

const SIDE_PICKER_KEYS = ['sale', 'study']

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function SectionControls() {
  const {
    lang,
    sections,
    toggleSection,
    itemCounts,
    setItemCount,
    keepSide,
    setKeepSide,
    activeProducts,
    toggleProduct,
    giftQr,
    toggleGiftQr,
    giftDesign,
    setGiftDesign,
    setQrImage,
  } = useAppState()
  const t = UI[lang]
  const labels = SECTION_LABELS[lang]
  const qrInputRef = useRef(null)

  const handleQrFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setQrImage(await readFileAsDataUrl(file))
  }

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
          <div className="promo-rail__card-top">
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
          </div>
          {key in itemCounts && (
            <>
              <div className="promo-rail__group">
                <p className="promo-rail__group-title">{t.cardCount}</p>
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
              </div>
              {SIDE_PICKER_KEYS.includes(key) && (
                <div className="promo-rail__group">
                  <p className="promo-rail__group-title">{t.designLabel}</p>
                  <span className="side-toggle">
                    <button
                      type="button"
                      className={`side-toggle__btn ${keepSide[key] === 'left' ? 'is-active' : ''}`}
                      disabled={!sections[key] || itemCounts[key] !== 1}
                      onClick={() => setKeepSide(key, 'left')}
                    >
                      {t.keepLeft}
                    </button>
                    <button
                      type="button"
                      className={`side-toggle__btn ${keepSide[key] === 'right' ? 'is-active' : ''}`}
                      disabled={!sections[key] || itemCounts[key] !== 1}
                      onClick={() => setKeepSide(key, 'right')}
                    >
                      {t.keepRight}
                    </button>
                  </span>
                </div>
              )}
            </>
          )}
          {key === 'gift' && (
            <>
              <div className="promo-rail__group">
                <p className="promo-rail__group-title">{t.designLabel}</p>
                <span className="side-toggle">
                  <button
                    type="button"
                    className={`side-toggle__btn ${giftDesign === 'A' ? 'is-active' : ''}`}
                    disabled={!sections.gift}
                    onClick={() => setGiftDesign('A')}
                  >
                    {t.keepLeft}
                  </button>
                  <button
                    type="button"
                    className={`side-toggle__btn ${giftDesign === 'B' ? 'is-active' : ''}`}
                    disabled={!sections.gift}
                    onClick={() => setGiftDesign('B')}
                  >
                    {t.keepRight}
                  </button>
                </span>
              </div>
              <div className="promo-rail__group">
                <p className="promo-rail__group-title">{t.qrToggle}</p>
                <label className="switch switch--sub promo-rail__subswitch">
                  <input
                    type="checkbox"
                    checked={giftQr}
                    disabled={!sections.gift}
                    onChange={toggleGiftQr}
                    aria-label={t.qrToggle}
                  />
                  <span className="switch__track">
                    <span className="switch__thumb" />
                  </span>
                </label>
                <button
                  type="button"
                  className="promo-rail__upload-btn"
                  disabled={!sections.gift || !giftQr}
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
            </>
          )}
        </div>
      ))}
    </div>
  )
}
