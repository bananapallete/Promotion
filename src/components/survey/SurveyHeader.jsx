import Editable from '../Editable.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function SurveyHeader() {
  const { lang, survey, updateSurvey } = useAppState()
  const header = survey[lang].header

  return (
    <div className="survey-header" data-lang={lang}>
      <div className="survey-header__glow" aria-hidden="true" />
      <Editable
        as="p"
        className="survey-header__title"
        value={header.title}
        onChange={(v) =>
          updateSurvey(lang, (d) => {
            d.header.title = v
          })
        }
      />
      <Editable
        as="p"
        multiline
        className="survey-header__subtitle"
        value={header.subtitle}
        onChange={(v) =>
          updateSurvey(lang, (d) => {
            d.header.subtitle = v
          })
        }
      />
    </div>
  )
}
