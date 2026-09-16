import TopBar from './components/TopBar.jsx'
import PromotionSheet from './components/promotion/PromotionSheet.jsx'
import SurveySheet from './components/survey/SurveySheet.jsx'
import { useAppState } from './state/AppState.jsx'
import { UI } from './i18n/ui.js'
import './styles/layout.css'
import './styles/promotion.css'
import './styles/survey.css'
import './styles/print.css'

function App() {
  const { lang } = useAppState()
  const t = UI[lang]

  return (
    <div className="app-shell">
      <TopBar />
      <main className="workspace">
        <section className="pane pane--promotion">
          <h2 className="pane__label no-print">{t.promotionPanel}</h2>
          <div className="pane__scroll">
            <PromotionSheet />
          </div>
        </section>
        <section className="pane pane--survey">
          <h2 className="pane__label no-print">{t.surveyPanel}</h2>
          <div className="pane__scroll">
            <SurveySheet />
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
