import { useState } from 'react'
import OptionEditPopup from './OptionEditPopup.jsx'

export default function SurveyNoticeList({ lang, notice, onChange }) {
  const [editingIndex, setEditingIndex] = useState(null)

  const updateLine = (i, value) => {
    onChange(notice.map((line, idx) => (idx === i ? value : line)))
  }

  const removeLine = (i) => {
    onChange(notice.filter((_, idx) => idx !== i))
  }

  return (
    <ul className="survey-notice__list">
      {notice.map((line, i) => (
        <li className="survey-notice__item-wrap" key={i}>
          <button type="button" className="survey-notice__item" onClick={() => setEditingIndex(i)}>
            {line}
          </button>
          {editingIndex === i && (
            <OptionEditPopup
              lang={lang}
              initialValue={line}
              canDelete
              onSave={(v) => updateLine(i, v)}
              onDelete={() => removeLine(i)}
              onClose={() => setEditingIndex(null)}
            />
          )}
        </li>
      ))}
    </ul>
  )
}
