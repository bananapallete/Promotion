import Editable from '../Editable.jsx'

export default function SurveySection({ index, title, onTitleChange, children, variant, bodyClassName }) {
  return (
    <div className={`survey-section ${variant === 'notice' ? 'survey-section--notice' : ''}`}>
      <div className="survey-section__label">
        {index && <span className="survey-section__index">{index}</span>}
        <Editable
          as="span"
          className="survey-section__title"
          value={title}
          onChange={onTitleChange}
          style={{ whiteSpace: 'normal' }}
        />
      </div>
      <div className={`survey-section__body ${bodyClassName || ''}`}>{children}</div>
    </div>
  )
}
