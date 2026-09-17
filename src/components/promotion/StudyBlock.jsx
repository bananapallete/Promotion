import Editable from '../Editable.jsx'
import CategoryHeader from './CategoryHeader.jsx'
import { useAppState } from '../../state/AppState.jsx'
import studySingleMLaptop from '../../assets/figma/benefit-bg/study-single-m-laptop.png'
import studySingleLLaptop from '../../assets/figma/benefit-bg/study-single-l-laptop.png'
import studySingleMCap from '../../assets/figma/benefit-bg/study-single-m-cap.png'
import studySingleLCap from '../../assets/figma/benefit-bg/study-single-l-cap.png'
import studyDoubleMLaptop from '../../assets/figma/benefit-bg/study-double-m-laptop.png'
import studyDoubleMCap from '../../assets/figma/benefit-bg/study-double-m-cap.png'
import studyDoubleLLaptop from '../../assets/figma/benefit-bg/study-double-l-laptop.png'
import studyDoubleLCap from '../../assets/figma/benefit-bg/study-double-l-cap.png'

function getStudyBg({ icon, compact, single }) {
  if (single) {
    if (icon === 'cap') {
      return compact ? studySingleMCap : studySingleLCap
    }
    return compact ? studySingleMLaptop : studySingleLLaptop
  }
  if (icon === 'cap') {
    return compact ? studyDoubleMCap : studyDoubleLCap
  }
  return compact ? studyDoubleMLaptop : studyDoubleLLaptop
}

function StudyBox({ data, icon, compact, single, onHeading, onDesc }) {
  const bg = getStudyBg({ icon, compact, single })
  return (
    <div
      className={`benefit-box benefit-box--study ${compact ? 'benefit-box--m' : 'benefit-box--l'} ${
        single ? 'benefit-box--single' : ''
      }`}
      style={{ backgroundImage: `url(${bg})` }}
    >
      <Editable
        as="p"
        multiline
        className="benefit-box__heading"
        value={compact ? data.headingM : data.headingL}
        onChange={onHeading}
      />
      <Editable
        as="p"
        multiline
        className="benefit-box__desc benefit-box__desc--study"
        value={data.desc}
        onChange={onDesc}
      />
    </div>
  )
}

export default function StudyBlock({ compact, single, keepSide = 'left' }) {
  const { lang, promotion, updatePromotion } = useAppState()
  const study = promotion[lang].study
  const showBox1 = !single || keepSide !== 'right'
  const showBox2 = !single || keepSide === 'right'

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
        {showBox1 && (
          <StudyBox
            data={study.box1}
            icon="laptop"
            compact={compact}
            single={single}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.study.box1[compact ? 'headingM' : 'headingL'] = v
              })
            }
            onDesc={(v) =>
              updatePromotion(lang, (d) => {
                d.study.box1.desc = v
              })
            }
          />
        )}
        {showBox2 && (
          <StudyBox
            data={study.box2}
            icon="cap"
            compact={compact}
            single={single}
            onHeading={(v) =>
              updatePromotion(lang, (d) => {
                d.study.box2[compact ? 'headingM' : 'headingL'] = v
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
