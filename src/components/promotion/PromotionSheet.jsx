import { Fragment } from 'react'
import Header from './Header.jsx'
import SectionControls from './SectionControls.jsx'
import SaleBlock from './SaleBlock.jsx'
import StudyBlock from './StudyBlock.jsx'
import GiftBlock from './GiftBlock.jsx'
import NoticeBlock from './NoticeBlock.jsx'
import Footer from './Footer.jsx'
import Divider from './Divider.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function PromotionSheet() {
  const { lang, sections, itemCounts, keepSide } = useAppState()
  const contentCount = ['sale', 'study', 'gift'].filter((key) => sections[key]).length
  const compact = contentCount >= 3
  const solo = contentCount === 1

  const blocks = [
    sections.sale && (
      <SaleBlock
        key="sale"
        compact={compact}
        single={itemCounts.sale === 1}
        solo={solo}
        keepSide={keepSide.sale}
      />
    ),
    sections.study && (
      <StudyBlock
        key="study"
        compact={compact}
        single={itemCounts.study === 1}
        solo={solo}
        keepSide={keepSide.study}
      />
    ),
    sections.gift && <GiftBlock key="gift" compact={compact} />,
    sections.notice && <NoticeBlock key="notice" />,
  ].filter(Boolean)

  return (
    <div className="promo-editor">
      <SectionControls />
      <div className="sheet-wrap">
        <div id="promotion-sheet" className="sheet promo-sheet" data-lang={lang}>
          <Header />
          <div className="promo-body">
            {blocks.map((block, i) => (
              <Fragment key={block.key}>
                {block}
                {i < blocks.length - 1 && <Divider />}
              </Fragment>
            ))}
            {blocks.length === 0 && (
              <div className="promo-body__empty">
                {lang === 'kr'
                  ? 'Sale / Study / Gift / Notice 섹션이 모두 꺼져 있습니다.'
                  : 'All Sale / Study / Gift / Notice sections are turned off.'}
              </div>
            )}
          </div>
          <Footer />
        </div>
      </div>
    </div>
  )
}
