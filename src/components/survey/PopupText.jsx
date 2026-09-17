import { useState } from 'react'
import OptionEditPopup from './OptionEditPopup.jsx'

export default function PopupText({
  lang,
  value,
  onChange,
  as: As = 'span',
  className,
  multiline = false,
  style,
}) {
  const [editing, setEditing] = useState(false)

  return (
    <As className="popup-text-wrap" style={style}>
      <button
        type="button"
        className={`popup-text-btn ${className || ''}`}
        onClick={() => setEditing(true)}
      >
        {multiline
          ? value.split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 && <br />}
              </span>
            ))
          : value}
      </button>
      {editing && (
        <OptionEditPopup
          lang={lang}
          initialValue={value}
          canDelete={false}
          multiline={multiline}
          onSave={onChange}
          onClose={() => setEditing(false)}
        />
      )}
    </As>
  )
}
