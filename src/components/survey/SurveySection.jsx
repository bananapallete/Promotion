export default function SurveySection({ index, title, children, variant }) {
  return (
    <div className={`survey-section ${variant === 'notice' ? 'survey-section--notice' : ''}`}>
      <div className="survey-section__label">
        {index && <span className="survey-section__index">{index}</span>}
        <span className="survey-section__title">{title}</span>
      </div>
      <div className="survey-section__body">{children}</div>
    </div>
  )
}
