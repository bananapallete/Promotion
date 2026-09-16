export default function SurveySection({ index, title, children, tall }) {
  return (
    <div className={`survey-section ${tall ? 'survey-section--tall' : ''}`}>
      <div className="survey-section__label">
        {index && <span className="survey-section__index">{index}</span>}
        <span className="survey-section__title">{title}</span>
      </div>
      <div className="survey-section__body">{children}</div>
    </div>
  )
}
