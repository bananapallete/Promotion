import { Fragment } from 'react'
import Header from './Header.jsx'
import SectionControls from './SectionControls.jsx'
import SaleBlock from './SaleBlock.jsx'
import StudyBlock from './StudyBlock.jsx'
import GiftBlock from './GiftBlock.jsx'
import Footer from './Footer.jsx'
import Divider from './Divider.jsx'
import { useAppState } from '../../state/AppState.jsx'

export default function PromotionSheet() {
  const { lang, sections, itemCounts } = useAppState()
  const activeCount = Object.values(sections).filter(Boolean).length
  const compact = activeCount >= 3

  const blocks = [
    sections.sale && <SaleBlock key="sale" compact={compact} single={itemCounts.sale === 1} />,
    sections.study && <StudyBlock key="study" compact={compact} single={itemCounts.study === 1} />,
    sections.gift && <GiftBlock key="gift" compact={compact} />,
  ].filter(Boolean)

  return (
    <div className="sheet-wrap">
      <SectionControls />
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
                ? 'Sale / Study / Gift 섹션이 모두 꺼져 있습니다.'
                : 'All Sale / Study / Gift sections are turned off.'}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </div>
  )
}
