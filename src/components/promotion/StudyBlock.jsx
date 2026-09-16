import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import studyLaptopImg from '../../assets/figma/study-laptop.png'
import studyGraduationCapImg from '../../assets/figma/study-graduation-cap.png'

function StudyBox({ data, icon, compact, single, onHeading, onDesc }) {
  return (
    <div
      className={`benefit-box benefit-box--study ${compact ? 'benefit-box--m' : 'benefit-box--l'} ${
        single ? 'benefit-box--single' : ''
      }`}
    >
      <div className="benefit-box__glow benefit-box__glow--gold" aria-hidden="true" />
      <Editable
        as="p"
        multiline
        className="benefit-box__heading"
        value={data.heading}
        onChange={onHeading}
      />
      <Editable
        as="p"
        multiline
        className="benefit-box__desc benefit-box__desc--study"
        value={data.desc}
        onChange={onDesc}
      />
      <img className="benefit-box__icon" src={icon} alt="" aria-hidden="true" />
    </div>
  )
}

export default function StudyBlock({ compact, single }) {
  const { lang, promotion, updatePromotion } = useAppState()
  const study = promotion[lang].study

  return (
    <div className="promo-block">
      <CategoryHeader
        title={study.title}
        subtitle={study.subtitle}
        compact={compact}
        onTitle={(v) =>
          updatePromotion(lang, (d) => {
            d.study.title = v
          })
        }
        onSubtitle={(v) =>
          updatePromotion(lang, (d) => {
            d.study.subtitle = v
          })
        }
      />
      <div className={`promo-block__row ${compact ? 'promo-block__row--m' : 'promo-block__row--l'}`}>
        <StudyBox
          data={study.box1}
          icon={studyLaptopImg}
          compact={compact}
          single={single}
          onHeading={(v) =>
            updatePromotion(lang, (d) => {
              d.study.box1.heading = v
            })
          }
          onDesc={(v) =>
            updatePromotion(lang, (d) => {
              d.study.box1.desc = v
            })
          }
        />
        {!single && (
          <StudyBox
            data={study.box2}
            icon={studyGraduationCapImg}
            compact={compact}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.study.box2.heading = v
              })
            }
            onDesc={(v) =>
              updatePromotion(lang, (d) => {
                d.study.box2.desc = v
              })
            }
          />
        )}
      </div>
    </div>
  )
}
