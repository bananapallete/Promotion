import { useState } from 'react'
import { UI } from '../../i18n/ui.js'
import OptionEditPopup from './OptionEditPopup.jsx'

let uid = 0
function nextId() {
  uid += 1
  return `opt-${Date.now()}-${uid}`
}

export function EditableOptionGroup({ options, onChange, lang }) {
  const t = UI[lang]
  const [editingId, setEditingId] = useState(null)

  const updateLabel = (id, label) => {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  const removeOption = (id) => {
    onChange(options.filter((o) => o.id !== id))
  }

  const addOption = (label) => {
    onChange([...options, { id: nextId(), label }])
  }

  return (
    <div className="survey-options">
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
      <span className="survey-option-wrap">
        <button type="button" className="survey-option__add no-print" onClick={() => setEditingId('__new__')}>
          + {t.addOption}
        </button>
        {editingId === '__new__' && (
          <OptionEditPopup
            lang={lang}
            initialValue={t.newOption}
            canDelete={false}
            onSave={(v) => addOption(v)}
            onClose={() => setEditingId(null)}
          />
        )}
      </span>
    </div>
  )
}

export function StaticOptionGroup({ options, className, onChange, lang }) {
  const [editingId, setEditingId] = useState(null)
  const editable = typeof onChange === 'function'

  const updateLabel = (id, label) => {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  return (
    <div className={`survey-options ${className || ''}`}>
      {options.map((opt) => (
        <span className="survey-option-wrap" key={opt.id}>
          <button
            type="button"
            className={`survey-option ${editable ? 'survey-option--editable' : ''}`}
            disabled={!editable}
            onClick={() => editable && setEditingId(opt.id)}
          >
            <span className="survey-option__box" aria-hidden="true" />
            <span className="survey-option__label">{opt.label}</span>
          </button>
          {editable && editingId === opt.id && (
            <OptionEditPopup
              lang={lang}
              initialValue={opt.label}
              canDelete={false}
              onSave={(v) => updateLabel(opt.id, v)}
              onClose={() => setEditingId(null)}
            />
          )}
        </span>
      ))}
    </div>
  )
}
