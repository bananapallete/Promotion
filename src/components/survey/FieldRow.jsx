export default function FieldGrid({ fields }) {
  return (
    <div className="survey-field-grid">
      {fields.map((label) => (
        <div className="survey-field" key={label}>
          <span className="survey-field__label">{label}</span>
          <span className="survey-field__line" />
        </div>
      ))}
    </div>
  )
}
