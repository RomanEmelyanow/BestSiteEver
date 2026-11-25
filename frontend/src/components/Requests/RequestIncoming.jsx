import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { authService } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../context/ConfirmContext'
import { RECIPIENT_LABELS, statusLabel } from '../../utils/labels'
import GlassSelect from '../GlassSelect'
import styles from './RequestList.module.css'

const RECIPIENT_OPTIONS = [
  { value: '', label: 'Все' },
  { value: 'admin', label: 'Админ' },
  { value: 'storekeeper', label: 'Завхоз' },
]

export default function RequestIncoming() {
  const { user, token } = useAuth()
  const confirm = useConfirm()
  const [requests, setRequests] = useState([])
  const [recipientFilter, setRecipientFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const isAdmin = user?.role === 'admin'

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authService.getRequests(
        {
          direction: 'incoming',
          status: 'sent',
          recipient_group: recipientFilter || undefined,
        },
        token
      )
      setRequests(data)
    } catch (error) {
      toast.error('Не удалось загрузить входящие заявки')
    } finally {
      setLoading(false)
    }
  }, [recipientFilter, token])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const handleProcess = async (request, status) => {
    const label = status === 'completed' ? 'выполнено' : 'невозможно выполнить'
    const result = await confirm({
      commentLabel: status === 'impossible' ? 'Комментарий для автора (необязательно)' : undefined,
      title: 'Обработка заявки',
      message: `Закрыть заявку «${request.title || request.classroom_number}» со статусом «${label}»?`,
      confirmLabel: status === 'completed' ? 'Выполнено' : 'Невозможно',
    })
    if (!result) {
      return
    }
    try {
      await authService.updateRequest(request.id, { status, admin_comment: result.comment || undefined }, token)
      toast.success('Заявка обработана')
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка обработки заявки')
    }
  }

  const handleRedirect = async (request) => {
    const target = request.recipient_group === 'admin' ? 'storekeeper' : 'admin'
    const ok = await confirm({
      title: 'Переадресация заявки',
      message: `Переадресовать заявку «${request.title || request.classroom_number}» (${RECIPIENT_LABELS[target]})?`,
      confirmLabel: 'Переадресовать',
    })
    if (!ok) {
      return
    }
    try {
      const result = await authService.redirectRequest(request.id, target, token)
      toast.success(result.message || 'Заявка переадресована')
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка переадресации')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Входящие заявки</h2>
        {isAdmin && (
          <div className={styles.filterGroup}>
            <label>Адресат</label>
            <GlassSelect
              value={recipientFilter}
              onChange={setRecipientFilter}
              options={RECIPIENT_OPTIONS}
            />
          </div>
        )}
        <button onClick={fetchRequests} className={styles.refreshBtn} disabled={loading}>
          {loading ? 'Обновление...' : 'Обновить'}
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка заявок...</div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Заявок нет</p>
        </div>
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => (
            <div key={request.id} className={styles.requestCard}>
              <div className={styles.requestHeader}>
                <span className={styles.requestStatusIcon}>📥</span>
                <div className={styles.requestInfo}>
                  <div className={styles.requestTitle}>
                    {request.title || `Заявка по кабинету ${request.classroom_number}`}
                  </div>
                </div>
              </div>
              <div className={styles.details}>
                <span><b>От:</b> {request.sender_name || '—'}</span>
                <span><b>Адресат:</b> {RECIPIENT_LABELS[request.recipient_group] || request.recipient_group}</span>
                <span><b>Кабинет:</b> {request.classroom_number || '—'}</span>
                <span><b>Статус:</b> {statusLabel(request.status, user?.role, request.recipient_group, true)}</span>
              </div>
              {request.description && (
                <p className={styles.requestDescription}>{request.description}</p>
              )}
              {request.status === 'sent' && (
                <div className={styles.requestActions}>
                  <button className={styles.actionBtn} onClick={() => handleProcess(request, 'completed')}>
                    Выполнено
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleProcess(request, 'impossible')}>
                    Невозможно выполнить
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleRedirect(request)}>
                    Переадресовать: {RECIPIENT_LABELS[request.recipient_group === 'admin' ? 'storekeeper' : 'admin']}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
