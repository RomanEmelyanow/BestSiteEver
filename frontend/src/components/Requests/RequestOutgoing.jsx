import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { authService } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { RECIPIENT_LABELS, statusLabel } from '../../utils/labels'
import GlassSelect from '../GlassSelect'
import styles from './RequestList.module.css'

const RECIPIENT_OPTIONS = [
  { value: '', label: 'Выберите адресата' },
  { value: 'admin', label: 'Админ' },
  { value: 'storekeeper', label: 'Завхоз' },
]

export default function RequestOutgoing() {
  const { user, token } = useAuth()
  const [requests, setRequests] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [ownClassrooms, setOwnClassrooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [formData, setFormData] = useState({
    classroom_id: '',
    recipient_group: '',
    title: '',
    description: '',
  })

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authService.getRequests({ direction: 'outgoing' }, token)
      setRequests(data)
    } catch (error) {
      toast.error('Не удалось загрузить исходящие заявки')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchClassrooms = useCallback(async () => {
    try {
      const [all, own] = await Promise.all([
        authService.getClassrooms(token),
        authService.getUserClassrooms(user.id, token),
      ])
      const sorted = [...all].sort((a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0))
      setClassrooms(sorted)
      setOwnClassrooms(own)
      setFormData(prev =>
        prev.classroom_id || own.length === 0
          ? prev
          : { ...prev, classroom_id: String(own[0].id) }
      )
    } catch (error) {
      toast.error('Не удалось загрузить кабинеты')
    }
  }, [token, user])

  useEffect(() => {
    fetchRequests()
    fetchClassrooms()
  }, [fetchRequests, fetchClassrooms])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.classroom_id) {
      toast.error('Выберите кабинет')
      return
    }
    if (!formData.recipient_group || !formData.title.trim()) {
      toast.error(!formData.recipient_group ? 'Выберите адресата' : 'Введите заголовок')
      return
    }
    setSending(true)
    try {
      await authService.createRequest(
        {
          classroom_id: parseInt(formData.classroom_id),
          recipient_group: formData.recipient_group,
          title: formData.title,
          description: formData.description,
        },
        token
      )
      toast.success('Заявка отправлена')
      setFormData(prev => ({
        ...prev,
        recipient_group: '',
        title: '',
        description: '',
        classroom_id: ownClassrooms.length ? String(ownClassrooms[0].id) : '',
      }))
      fetchRequests()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка отправки заявки')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Новая заявка</h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.requestForm}>
        <div className={styles.formRow}>
          <div className={styles.filterGroup}>
            <label>Кабинет</label>
            <GlassSelect
              searchable
              value={formData.classroom_id}
              onChange={(value) => setFormData({ ...formData, classroom_id: value })}
              options={[
                { value: '', label: 'Выберите кабинет' },
                ...classrooms.map((classroom) => ({ value: String(classroom.id), label: classroom.number })),
              ]}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>Адресат</label>
            <GlassSelect
              value={formData.recipient_group}
              onChange={(value) => setFormData({ ...formData, recipient_group: value })}
              options={RECIPIENT_OPTIONS}
            />
          </div>


        </div>

        <div className={styles.formGroup}>
          <label htmlFor="request-title">Заголовок</label>
          <input
            required
            id="request-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: не работает проектор"
            className={styles.titleInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="request-description">Описание</label>
          <textarea
            id="request-description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Подробности заявки"
            rows={6}
            className={styles.descriptionInput}
          />
        </div>
        <button type="submit" className={styles.refreshBtn} disabled={sending || !formData.classroom_id || !formData.recipient_group || !formData.title.trim()}>
            {sending ? 'Отправка...' : 'Отправить'}
        </button>
      </form>

      <div className={styles.toolbar}>
        <h2>Исходящие заявки</h2>
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
                <span className={styles.requestStatusIcon}>📤</span>
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
                <span><b>Статус:</b> {statusLabel(request.status, user?.role, request.recipient_group)}</span>
              </div>
              {request.status === 'impossible' && request.admin_comment && (
                <p className={styles.executorComment}><strong>Комментарий исполнителя</strong>{request.admin_comment}</p>
              )}
              {request.description && (
                <p className={styles.requestDescription}>{request.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
