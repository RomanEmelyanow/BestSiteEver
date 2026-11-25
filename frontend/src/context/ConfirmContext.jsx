import { createContext, useCallback, useContext, useRef, useState } from 'react'
import styles from './ConfirmContext.module.css'

const ConfirmContext = createContext(null)

export const useConfirm = () => useContext(ConfirmContext)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const commentRef = useRef(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState(typeof options === 'string' ? { message: options } : options)
    })
  }, [])

  const close = (result) => {
    resolveRef.current?.(result)
    resolveRef.current = null
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className={styles.overlay} onClick={() => close(false)}>
          <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.title}>{state.title || 'Подтверждение'}</h3>
            <p className={styles.message}>{state.message}</p>
            {state.commentLabel && (
              <label className={styles.commentField}>
                {state.commentLabel}
                <textarea ref={commentRef} rows={3} placeholder="Например, нужна запасная лампа" />
              </label>
            )}
            <div className={styles.actions}>
              <button className={styles.cancelBtn} onClick={() => close(false)}>
                Отмена
              </button>
              <button
                className={`${styles.confirmBtn} ${state.danger ? styles.danger : ''}`}
                onClick={() => close(state.commentLabel ? { comment: commentRef.current.value.trim() } : true)}
              >
                {state.confirmLabel || 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
