import PopupText from './PopupText.jsx'

export default function SurveySection({
  lang,
  index,
  onIndexChange,
  title,
  onTitleChange,
  children,
  variant,
  bodyClassName,
}) {
  return (
    <div className={`survey-section ${variant === 'notice' ? 'survey-section--notice' : ''}`}>
      <div className="survey-section__label">
        {index && (
          <PopupText
            lang={lang}
            as="span"
            className="survey-section__index"
            value={index}
            onChange={onIndexChange}
          />
        )}
        <PopupText
          lang={lang}
          as="span"
          multiline
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
