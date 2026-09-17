import PopupText from './PopupText.jsx'
import { useAppState } from '../../state/AppState.jsx'
import headerBgImg from '../../assets/figma/survey-header-bg.png'

export default function SurveyHeader() {
  const { lang, survey, updateSurvey } = useAppState()
  const header = survey[lang].header

  return (
    <div className="survey-header" data-lang={lang}>
      <img className="survey-header__bg" src={headerBgImg} alt="" aria-hidden="true" />
      <PopupText
        lang={lang}
        as="p"
        className="survey-header__eyebrow"
        value={header.eyebrow}
        onChange={(v) =>
          updateSurvey(lang, (d) => {
            d.header.eyebrow = v
          })
        }
      />
      <PopupText
        lang={lang}
        as="p"
        className="survey-header__title"
        value={header.title}
        onChange={(v) =>
          updateSurvey(lang, (d) => {
            d.header.title = v
          })
        }
      />
      <span className="survey-header__rule" aria-hidden="true" />
      <PopupText
        lang={lang}
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
