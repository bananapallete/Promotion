import { useState } from 'react'
import Editable from '../Editable.jsx'
import OptionEditPopup from './OptionEditPopup.jsx'

function splitParenthetical(text) {
  const match = text.match(/^(.*?)\s*(\([^)]*\))\s*$/)
  if (!match) return { main: text, paren: '' }
  return { main: match[1], paren: match[2] }
}

function SpecialFieldLabel({ lang, value, onChange }) {
  const [editing, setEditing] = useState(false)
  const { main, paren } = splitParenthetical(value)

  return (
    <span className="survey-field__label-wrap">
      <button
        type="button"
        className="survey-field__label--special"
        onClick={() => setEditing(true)}
      >
        {main}
        {paren && <span className="survey-field__label-paren"> {paren}</span>}
      </button>
      {editing && (
        <OptionEditPopup
          lang={lang}
          initialValue={value}
          canDelete={false}
          onSave={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </span>
  )
}

export default function FieldGrid({ fields, onChange, lang, specialIndex }) {
  return (
    <div className="survey-field-grid">
      {fields.map((label, i) => (
        <div className="survey-field" key={i}>
          {i === specialIndex ? (
            <SpecialFieldLabel lang={lang} value={label} onChange={(v) => onChange(i, v)} />
          ) : (
            <Editable
              as="span"
              className="survey-field__label"
              value={label}
              onChange={(v) => onChange(i, v)}
              style={{ whiteSpace: 'normal' }}
            />
          )}
          <span className="survey-field__line" />
        </div>
      ))}
    </div>
  )
}
