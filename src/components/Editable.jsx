import { useCallback, useEffect, useRef } from 'react'

/**
 * Inline contentEditable text field. Enter inserts a line break when
 * `multiline` is true (browser default behaviour); otherwise Enter commits
 * and blurs. Changes commit on blur, not on every keystroke, so the caret
 * position is never disturbed while typing.
 */
export default function Editable({
  value,
  onChange,
  multiline = false,
  as: As = 'div',
  className,
  style,
  ariaLabel,
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const current = el.innerText.replace(/\n+$/, '')
    if (current !== value) {
      el.innerText = value
    }
  }, [value])

  const handleBlur = useCallback(() => {
    const el = ref.current
    if (!el) return
    const next = el.innerText.replace(/\r\n/g, '\n').replace(/\n+$/, '')
    if (next !== value) onChange(next)
  }, [value, onChange])

  const handleKeyDown = useCallback(
    (e) => {
      if (!multiline && e.key === 'Enter') {
        e.preventDefault()
        ref.current?.blur()
      }
      if (e.key === 'Escape') {
        if (ref.current) ref.current.innerText = value
        ref.current?.blur()
      }
    },
    [multiline, value],
  )

  const handlePaste = useCallback((e) => {
    e.preventDefault()
    const text = (e.clipboardData || window.clipboardData).getData('text/plain')
    document.execCommand('insertText', false, text)
  }, [])

  return (
    <As
      ref={ref}
      className={['editable', multiline ? 'editable--multiline' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      aria-multiline={multiline}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  )
}
