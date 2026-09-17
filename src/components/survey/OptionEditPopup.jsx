import { useEffect, useRef, useState } from 'react'
import { UI } from '../../i18n/ui.js'

export default function OptionEditPopup({ lang, initialValue, canDelete, onSave, onDelete, onClose }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)
  const t = UI[lang]

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSave(trimmed)
    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="option-popup__overlay no-print" onMouseDown={onClose}>
      <form
        className="option-popup"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <input
          ref={inputRef}
          className="option-popup__input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="option-popup__actions">
          {canDelete && (
            <button
              type="button"
              className="option-popup__btn option-popup__btn--danger"
              onClick={() => {
                onDelete()
                onClose()
              }}
            >
              {t.removeOption}
            </button>
          )}
          <button type="button" className="option-popup__btn" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="option-popup__btn option-popup__btn--primary">
            {t.ok}
          </button>
        </div>
      </form>
    </div>
  )
}
