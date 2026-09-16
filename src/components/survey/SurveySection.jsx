export default function SurveySection({ index, title, children, variant, bodyClassName }) {
  return (
    <div className={`survey-section ${variant === 'notice' ? 'survey-section--notice' : ''}`}>
      <div className="survey-section__label">
        {index && <span className="survey-section__index">{index}</span>}
        <span className="survey-section__title">{title}</span>
      </div>
      <div className={`survey-section__body ${bodyClassName || ''}`}>{children}</div>
    </div>
  )
}
