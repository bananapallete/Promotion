import Editable from '../Editable.jsx'
import { UI } from '../../i18n/ui.js'

let uid = 0
function nextId() {
  uid += 1
  return `opt-${Date.now()}-${uid}`
}

export function EditableOptionGroup({ options, onChange, lang }) {
  const t = UI[lang]

  const updateLabel = (id, label) => {
    onChange(options.map((o) => (o.id === id ? { ...o, label } : o)))
  }

  const removeOption = (id) => {
    onChange(options.filter((o) => o.id !== id))
  }

  const addOption = () => {
    onChange([...options, { id: nextId(), label: t.newOption }])
  }

  return (
    <div className="survey-options">
      {options.map((opt) => (
        <span className="survey-option survey-option--editable" key={opt.id}>
          <span className="survey-option__box" aria-hidden="true" />
          <Editable
            as="span"
            className="survey-option__label"
            value={opt.label}
            onChange={(v) => updateLabel(opt.id, v)}
          />
          {opt.hasBlank && <span className="survey-option__blank" aria-hidden="true" />}
          <button
            type="button"
            className="survey-option__remove no-print"
            title={t.removeOption}
            onClick={() => removeOption(opt.id)}
          >
            ×
          </button>
        </span>
      ))}
      <button type="button" className="survey-option__add no-print" onClick={addOption}>
        + {t.addOption}
      </button>
    </div>
  )
}

export function StaticOptionGroup({ options }) {
  return (
    <div className="survey-options">
      {options.map((opt) => (
        <span className="survey-option" key={opt.id}>
          <span className="survey-option__box" aria-hidden="true" />
          <span className="survey-option__label">{opt.label}</span>
        </span>
      ))}
    </div>
  )
}
