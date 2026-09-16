import Editable from '../Editable.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function NoticeBlock() {
  const { lang, promotion, updatePromotion } = useAppState()
  const notice = promotion[lang].notice

  return (
    <div className="notice-block">
      <Editable
        as="p"
        className="notice-block__title"
        value={notice.title}
        onChange={(v) =>
          updatePromotion(lang, (d) => {
            d.notice.title = v
          })
        }
      />
      <div className="notice-block__cols">
        <Editable
          as="p"
          multiline
          className="notice-block__col"
          value={notice.col1}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.notice.col1 = v
            })
          }
        />
        <Editable
          as="p"
          multiline
          className="notice-block__col"
          value={notice.col2}
          onChange={(v) =>
            updatePromotion(lang, (d) => {
              d.notice.col2 = v
            })
          }
        />
      </div>
    </div>
  )
}
