import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { authService } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { RECIPIENT_LABELS } from '../../utils/labels'
import { useConfirm } from '../../context/ConfirmContext'
import styles from './RequestList.module.css'

const STATUS_META = {
  sent: { label: 'Не обработано', badge: 'statusSent', tint: '' },
  completed: { label: 'Выполнено', badge: 'statusCompleted', tint: 'tintCompleted' },
  impossible: { label: 'Невозможно выполнить', badge: 'statusImpossible', tint: 'tintImpossible' },
}

export default function RequestArchive() {
  const { user, token } = useAuth()
  const confirm = useConfirm()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ date: '', query: '' })

  const fetchArchive = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authService.getRequests({ direction: 'incoming', status: 'archive' }, token)
      setRequests(data)
    } catch (error) {
      toast.error('Не удалось загрузить архив')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchArchive()
  }, [fetchArchive])

  const filtered = useMemo(() => {
    const query = filters.query.trim().toLowerCase()
    return requests.filter(request => {
      if (filters.date && new Date(request.created_at).toISOString().slice(0, 10) !== filters.date) {
        return false
      }
      if (query) {
        const sender = (request.sender_name || '').toLowerCase()
        const classroom = String(request.classroom_number || '')
        if (!sender.includes(query) && !classroom.includes(query)) return false
      }
      return true
    })
  }, [requests, filters])

  const handleDelete = async (request) => {
    const label = request.title || `заявку по кабинету ${request.classroom_number}`
    const ok = await confirm({
      title: 'Удаление из архива',
      message: `Удалить ${label} из архива безвозвратно?`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await authService.deleteRequest(request.id, token)
      toast.success('Заявка удалена из архива')
      fetchArchive()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка удаления')
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Архив заявок</h2>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <label htmlFor="archive-date">Дата заявки</label>
          <input
            id="archive-date"
            type="date"
            className={styles.select}
            value={filters.date}
            onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="archive-query">Фамилия или кабинет</label>
          <input
            id="archive-query"
            type="text"
            className={styles.select}
            placeholder="Например: Иванов или 105"
            value={filters.query}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
          />
        </div>

        <button className={styles.refreshBtn} onClick={fetchArchive} disabled={loading}>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка архива...</div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p>В архиве пусто</p>
        </div>
      ) : (
        <div className={styles.requestsList}>
          {filtered.map(request => {
            const meta = STATUS_META[request.status] || STATUS_META.sent
            return (
              <div
                key={request.id}
                className={`${styles.requestCard} ${meta.tint ? styles[meta.tint] : ''}`}
              >
                <span className={`${styles.archiveStatus} ${styles[meta.badge]}`}>
                  {meta.label}
                </span>

                <div className={`${styles.requestHeader} ${styles.archiveHeader}`}>
                  <span className={styles.requestStatusIcon}>🗄️</span>
                  <div className={styles.requestInfo}>
                    <div className={styles.requestTitle}>
                      {request.title || `Заявка по кабинету ${request.classroom_number}`}
                    </div>
                    <div className={styles.requestMeta}>
                      <span>От: {request.sender_name || '—'}</span>
                      <span>Адресат: {RECIPIENT_LABELS[request.recipient_group] || request.recipient_group}</span>
                      <span>Кабинет: {request.classroom_number || '—'}</span>
                      <span>Дата: {new Date(request.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>
                </div>

                {request.description && (
                  <p className={styles.requestDescription}>{request.description}</p>
                )}

                {request.admin_comment && (
                  <p className={styles.requestDescription}>Комментарий: {request.admin_comment}</p>
                )}

                {user?.role === 'admin' && (
                  <div className={styles.requestActions}>
                    <button className={styles.actionBtn} onClick={() => handleDelete(request)}>
                      Удалить из архива
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
