import PopupText from './PopupText.jsx'
import SurveyHeader from './SurveyHeader.jsx'
import SurveySection from './SurveySection.jsx'
import SurveyControls from './SurveyControls.jsx'
import FieldGrid from './FieldRow.jsx'
import { EditableOptionGroup } from './OptionGroup.jsx'
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

  const removeListItem = (key, index) =>
    updateSurvey(lang, (d) => {
      d[key].splice(index, 1)
    })

  return (
    <div className="promo-editor">
      <SurveyControls />
      <div className="sheet-wrap">
        <div id="survey-sheet" className="sheet survey-sheet" data-lang={lang}>
          <SurveyHeader />
          <div className="survey-body">
            <SurveySection
              lang={lang}
              index={data.sectionIndexes.section01}
              onIndexChange={(v) => setField(['sectionIndexes', 'section01'], v)}
              title={data.sectionTitles.section01}
              onTitleChange={(v) => setField(['sectionTitles', 'section01'], v)}
            >
              <FieldGrid
                fields={data.fields01}
                onChange={(i, v) => setListItem('fields01', i, v)}
                lang={lang}
                removable
                onRemove={(i) => removeListItem('fields01', i)}
              />
            </SurveySection>

            <SurveySection
              lang={lang}
              index={data.sectionIndexes.section02}
              onIndexChange={(v) => setField(['sectionIndexes', 'section02'], v)}
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
              <EditableOptionGroup
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
              lang={lang}
              index={data.sectionIndexes.section03}
              onIndexChange={(v) => setField(['sectionIndexes', 'section03'], v)}
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
              lang={lang}
              index={data.sectionIndexes.section04}
              onIndexChange={(v) => setField(['sectionIndexes', 'section04'], v)}
              title={data.sectionTitles.section04}
              onTitleChange={(v) => setField(['sectionTitles', 'section04'], v)}
              bodyClassName="survey-section__body--consult"
            >
              <EditableOptionGroup
                lang={lang}
                options={data.consentOptions}
                className="survey-options--consent"
                onChange={(next) =>
                  updateSurvey(lang, (d) => {
                    d.consentOptions = next
                  })
                }
              />
              <FieldGrid
                fields={data.fields04}
                onChange={(i, v) => setListItem('fields04', i, v)}
                lang={lang}
              />
            </SurveySection>

            <SurveySection
              lang={lang}
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
            <PopupText
              lang={lang}
              as="span"
              className="promo-footer__contact"
              value={data.footer.contact}
              onChange={(v) => setField(['footer', 'contact'], v)}
            />
            <div className="promo-footer__info">
              <PopupText
                lang={lang}
                as="span"
                value={data.footer.name}
                onChange={(v) => setField(['footer', 'name'], v)}
              />
              <span className="promo-footer__sep">|</span>
              <PopupText
                lang={lang}
                as="span"
                value={data.footer.phone}
                onChange={(v) => setField(['footer', 'phone'], v)}
              />
              <span className="promo-footer__sep">|</span>
              <PopupText
                lang={lang}
                as="span"
                value={data.footer.email}
                onChange={(v) => setField(['footer', 'email'], v)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
