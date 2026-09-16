import SurveyHeader from './SurveyHeader.jsx'
import SurveySection from './SurveySection.jsx'
import FieldGrid from './FieldRow.jsx'
import { EditableOptionGroup, StaticOptionGroup } from './OptionGroup.jsx'
import { useAppState } from '../../state/AppState.jsx'

const FIELD_LABELS = {
  kr: {
    section01: '고객 정보',
    fields01: ['성함', '회사/기관명', '직함', '전화번호', '이메일'],
    section02: '관심 제품 선택',
    section03: '구매 및 견적 상세',
    fields03: [
      '선택 제품 / 패키지',
      '구매 카피 수',
      '정상가',
      '적용 프로모션 혜택',
      '유지보수 비용',
      '최종 구매 금액 (총액)',
    ],
    section04: '구매 의향 상담 요청',
    fields04: ['날짜', '성함 / 서명'],
    noticeLabel: '안내사항',
    footerContact: '구매 · 기술 문의',
    footerName: '마이다스 아이티 홍길동 프로',
    footerPhone: 'M. +82-10-1234-5678',
    footerEmail: 'E. hgd0901@midasit.com',
  },
  en: {
    section01: 'Basic Info',
    fields01: ['Full Name', 'Company/Organization', 'Job Title', 'Phone', 'Email'],
    section02: 'Purchase Interest',
    section03: 'Purchase & Quotation Details',
    fields03: [
      'Selected Product / Package',
      'Quantity',
      'List Price',
      'Promotion / Offer Applied',
      'Maintenance Fee',
      'Final Price (Grand Total)',
    ],
    section04: 'Purchase Intent / Consultation',
    fields04: ['Date', 'Name / Signature'],
    noticeLabel: 'Notice',
    footerContact: 'SALES & TECHNICAL INQUIRIES',
    footerName: 'MIDAS IT BRUNO MARS',
    footerPhone: 'M. +82-10-1234-5678',
    footerEmail: 'E. hgd0901@midasit.com',
  },
}

export default function SurveySheet() {
  const { lang, survey, updateSurvey } = useAppState()
  const data = survey[lang]
  const labels = FIELD_LABELS[lang]

  return (
    <div className="sheet-wrap">
      <div id="survey-sheet" className="sheet survey-sheet" data-lang={lang}>
        <SurveyHeader />
        <div className="survey-body">
          <SurveySection index="01" title={labels.section01}>
            <FieldGrid fields={labels.fields01} />
          </SurveySection>

          <SurveySection index="02" title={labels.section02}>
            <EditableOptionGroup
              lang={lang}
              options={data.interestOptions}
              onChange={(next) =>
                updateSurvey(lang, (d) => {
                  d.interestOptions = next
                })
              }
            />
            <StaticOptionGroup options={data.purchaseTypeOptions} />
          </SurveySection>

          <SurveySection index="03" title={labels.section03} tall>
            <FieldGrid fields={labels.fields03} />
          </SurveySection>

          <SurveySection index="04" title={labels.section04}>
            <StaticOptionGroup options={data.consentOptions} />
            <FieldGrid fields={labels.fields04} />
          </SurveySection>

          <div className="survey-notice">
            <span className="survey-notice__label">{labels.noticeLabel}</span>
            <ul className="survey-notice__list">
              {data.notice.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="promo-footer">
          <span className="promo-footer__contact">{labels.footerContact}</span>
          <div className="promo-footer__info">
            <span>{labels.footerName}</span>
            <span className="promo-footer__sep">|</span>
            <span>{labels.footerPhone}</span>
            <span className="promo-footer__sep">|</span>
            <span>{labels.footerEmail}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
