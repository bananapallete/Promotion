import { useState } from 'react'
import OptionEditPopup from './OptionEditPopup.jsx'

let uid = 0
export function nextOptionId() {
  uid += 1
  return `opt-${Date.now()}-${uid}`
}

export function EditableOptionGroup({ options, onChange, lang, className }) {
  const [editingId, setEditingId] = useState(null)

  const updateLabel = (id, label) => {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  const removeOption = (id) => {
    onChange(options.filter((o) => o.id !== id))
  }

  return (
    <div className={`survey-options ${className || ''}`}>
      {options.map((opt) => (
        <span className="survey-option-wrap" key={opt.id}>
          <button
            type="button"
            className="survey-option survey-option--editable"
            onClick={() => setEditingId(opt.id)}
          >
            <span className="survey-option__box" aria-hidden="true" />
            <span className="survey-option__label">{opt.label}</span>
            {opt.hasBlank && <span className="survey-option__blank" aria-hidden="true" />}
          </button>
          {editingId === opt.id && (
            <OptionEditPopup
              lang={lang}
              initialValue={opt.label}
              canDelete
              onSave={(v) => updateLabel(opt.id, v)}
              onDelete={() => removeOption(opt.id)}
              onClose={() => setEditingId(null)}
            />
          )}
        </span>
      ))}
    </div>
  )
}
