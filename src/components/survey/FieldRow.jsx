import Editable from '../Editable.jsx'

export default function FieldGrid({ fields, onChange }) {
  return (
    <div className="survey-field-grid">
      {fields.map((label, i) => (
        <div className="survey-field" key={i}>
          <Editable
            as="span"
            className="survey-field__label"
            value={label}
            onChange={(v) => onChange(i, v)}
            style={{ whiteSpace: 'normal' }}
          />
          <span className="survey-field__line" />
        </div>
      ))}
    </div>
  )
}
