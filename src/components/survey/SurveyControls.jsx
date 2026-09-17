import { useAppState } from '../../state/AppState.jsx'
import { UI } from '../../i18n/ui.js'
import { nextOptionId } from './OptionGroup.jsx'

export default function SurveyControls() {
  const { lang, survey, updateSurvey } = useAppState()
  const t = UI[lang]
  const r = t.surveyRail

  const addOption = (key) =>
    updateSurvey(lang, (d) => {
      d[key].push({ id: nextOptionId(), label: t.newOption })
    })

  const addNotice = () =>
    updateSurvey(lang, (d) => {
      d.notice.push(t.newNotice)
    })

  return (
    <div className="promo-rail no-print">
      <div className="promo-rail__card">
        <p className="promo-rail__card-title">{r.interest}</p>
        <p className="promo-rail__card-desc">{r.interestDesc}</p>
        <button type="button" className="survey-option__add" onClick={() => addOption('interestOptions')}>
          + {t.addOption}
        </button>
      </div>

      <div className="promo-rail__card">
        <p className="promo-rail__card-title">{r.purchaseType}</p>
        <p className="promo-rail__card-desc">{r.purchaseTypeDesc}</p>
        <button
          type="button"
          className="survey-option__add"
          onClick={() => addOption('purchaseTypeOptions')}
        >
          + {t.addOption}
        </button>
      </div>

      <div className="promo-rail__card">
        <p className="promo-rail__card-title">{r.consent}</p>
        <p className="promo-rail__card-desc">{r.consentDesc}</p>
        <button type="button" className="survey-option__add" onClick={() => addOption('consentOptions')}>
          + {t.addOption}
        </button>
      </div>

      <div className="promo-rail__card">
        <p className="promo-rail__card-title">{r.notice}</p>
        <p className="promo-rail__card-desc">{r.noticeDesc}</p>
        <button type="button" className="survey-notice__add" onClick={addNotice}>
          + {t.addNotice}
        </button>
      </div>
    </div>
  )
}
