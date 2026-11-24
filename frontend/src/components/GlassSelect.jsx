import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './GlassSelect.module.css'

export default function GlassSelect({ value, onChange, options, placeholder = 'Выберите...', className = '', id }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    const onDown = (event) => {
      const target = event.target
      if (rootRef.current?.contains(target)) return
      if (panelRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (!open) return
    const update = () => {
      const rect = toggleRef.current?.getBoundingClientRect()
      if (!rect) return
      const height = panelRef.current?.offsetHeight || 0
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const dropUp = height > spaceBelow && rect.top - 8 > spaceBelow
      setPos({
        top: dropUp ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 160),
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  const current = options.find(opt => String(opt.value) === String(value))

  return (
    <div className={`${styles.select} ${className}`} ref={rootRef}>
      <button
        type="button"
        id={id}
        ref={toggleRef}
        className={styles.toggle}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={current ? styles.value : styles.placeholderText}>
          {current ? current.label : placeholder}
        </span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open &&
        createPortal(
          <ul
            className={styles.panel}
            role="listbox"
            ref={panelRef}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map(opt => {
              const selected = String(opt.value) === String(value)
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={selected}
                  className={`${styles.option} ${selected ? styles.selected : ''}`}
                  onClick={() => {
                    onChange(opt.value)
                    setOpen(false)
                  }}
                >
                  {opt.label}
                </li>
              )
            })}
          </ul>,
          document.body
        )}
    </div>
  )
}
