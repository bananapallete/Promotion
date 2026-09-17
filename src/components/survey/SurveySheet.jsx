import Editable from '../Editable.jsx'
import SurveyHeader from './SurveyHeader.jsx'
import SurveySection from './SurveySection.jsx'
import FieldGrid from './FieldRow.jsx'
import { EditableOptionGroup, StaticOptionGroup } from './OptionGroup.jsx'
import SurveyNoticeList from './SurveyNoticeList.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function SurveySheet() {
  const { lang, survey, updateSurvey } = useAppState()
  const data = survey[lang]

  const setField = (path, value) =>
    updateSurvey(lang, (d) => {
      path.slice(0, -1).reduce((o, k) => o[k], d)[path[path.length - 1]] = value
    })

  const setListItem = (key, index, value) =>
    updateSurvey(lang, (d) => {
      d[key][index] = value
    })

  return (
    <div className="sheet-wrap">
      <div id="survey-sheet" className="sheet survey-sheet" data-lang={lang}>
        <SurveyHeader />
        <div className="survey-body">
          <SurveySection
            index="01"
            title={data.sectionTitles.section01}
            onTitleChange={(v) => setField(['sectionTitles', 'section01'], v)}
          >
            <FieldGrid fields={data.fields01} onChange={(i, v) => setListItem('fields01', i, v)} />
          </SurveySection>

          <SurveySection
            index="02"
            title={data.sectionTitles.section02}
            onTitleChange={(v) => setField(['sectionTitles', 'section02'], v)}
            bodyClassName="survey-section__body--options"
          >
            <EditableOptionGroup
              lang={lang}
              options={data.interestOptions}
              onChange={(next) =>
                updateSurvey(lang, (d) => {
                  d.interestOptions = next
                })
              }
            />
            <StaticOptionGroup
              lang={lang}
              options={data.purchaseTypeOptions}
              onChange={(next) =>
                updateSurvey(lang, (d) => {
                  d.purchaseTypeOptions = next
                })
              }
            />
          </SurveySection>

          <SurveySection
            index="03"
            title={data.sectionTitles.section03}
            onTitleChange={(v) => setField(['sectionTitles', 'section03'], v)}
          >
            <FieldGrid
              fields={data.fields03}
              onChange={(i, v) => setListItem('fields03', i, v)}
              lang={lang}
              specialIndex={5}
            />
          </SurveySection>

          <SurveySection
            index="04"
            title={data.sectionTitles.section04}
            onTitleChange={(v) => setField(['sectionTitles', 'section04'], v)}
            bodyClassName="survey-section__body--consult"
          >
            <StaticOptionGroup
              lang={lang}
              options={data.consentOptions}
              className="survey-options--consent"
              onChange={(next) =>
                updateSurvey(lang, (d) => {
                  d.consentOptions = next
                })
              }
            />
            <FieldGrid fields={data.fields04} onChange={(i, v) => setListItem('fields04', i, v)} />
          </SurveySection>

          <SurveySection
            title={data.noticeLabel}
            onTitleChange={(v) => setField(['noticeLabel'], v)}
            variant="notice"
          >
            <SurveyNoticeList
              lang={lang}
              notice={data.notice}
              onChange={(next) =>
                updateSurvey(lang, (d) => {
                  d.notice = next
                })
              }
            />
          </SurveySection>
        </div>
        <div className="promo-footer">
          <Editable
            as="span"
            className="promo-footer__contact"
            value={data.footer.contact}
            onChange={(v) => setField(['footer', 'contact'], v)}
          />
          <div className="promo-footer__info">
            <Editable
              as="span"
              value={data.footer.name}
              onChange={(v) => setField(['footer', 'name'], v)}
            />
            <span className="promo-footer__sep">|</span>
            <Editable
              as="span"
              value={data.footer.phone}
              onChange={(v) => setField(['footer', 'phone'], v)}
            />
            <span className="promo-footer__sep">|</span>
            <Editable
              as="span"
              value={data.footer.email}
              onChange={(v) => setField(['footer', 'email'], v)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
