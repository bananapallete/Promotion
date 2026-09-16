import Editable from '../Editable.jsx'

export default function CategoryHeader({ title, subtitle, onTitle, onSubtitle, compact }) {
  return (
    <div className={`category-header ${compact ? 'category-header--m' : 'category-header--l'}`}>
      <Editable as="p" className="category-header__title" value={title} onChange={onTitle} />
      <Editable
        as="p"
        className="category-header__subtitle"
        value={subtitle}
        onChange={onSubtitle}
      />
    </div>
  )
}
