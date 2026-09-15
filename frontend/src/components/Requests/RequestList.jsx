import { useState, useEffect } from 'react'
import { authService } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import { parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import styles from './RequestList.module.css'

export default function RequestList() {
  const [requests, setRequests] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [recipientGroupFilter, setRecipientGroupFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const { user, token } = useAuth()

  useEffect(() => {
    fetchRequests()
  }, [token, statusFilter, recipientGroupFilter])

  const fetchRequests = async () => {
    setLoading(true)
    try {
      const response = await authService.getRequests(
        { status: statusFilter, recipient_group: recipientGroupFilter },
        token
      )
      setRequests(response)
    } catch (error) {
      console.error('Error fetching requests:', error)
      toast.error('Не удалось загрузить заявки')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (status) => {
    setStatusFilter(status)
    fetchRequests()
  }

  const handleRecipientGroupChange = (group) => {
    setRecipientGroupFilter(group)
    fetchRequests()
  }

  const statusLabels = {
    pending: 'pending (новая)',
    urgent: 'urgent (срочная)',
    longterm: 'longterm (долгосрочная)',
    completed: 'completed (выполнена)',
    impossible: 'impossible (невозможно)',
  }

  const statusColors = {
    pending: 'bg-green-100 text-green-800',
    urgent: 'bg-blue-100 text-blue-800',
    longterm: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-white text-black',
    impossible: 'bg-red-100 text-red-800',
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <label>Статус</label>
          <select
            onChange={(e) => handleStatusChange(e.target.value)}
            value={statusFilter || 'all'}
            className={styles.select}
          >
            <option value="">Все статусы</option>
            <option value="pending" selected={statusFilter === 'pending'}>pending (новая)</option>
            <option value="urgent" selected={statusFilter === 'urgent'}>urgent (срочная)</option>
            <option value="longterm" selected={statusFilter === 'longterm'}>longterm (долгосрочная)</option>
            <option value="completed" selected={statusFilter === 'completed'}>completed (выполнена)</option>
            <option value="impossible" selected={statusFilter === 'impossible'}>impossible (невозможно)</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Группа получателя</label>
          <select
            onChange={(e) => handleRecipientGroupChange(e.target.value)}
            value={recipientGroupFilter || 'all'}
            className={styles.select}
          >
            <option value="">Все группы</option>
            <option value="admin" selected={recipientGroupFilter === 'admin'}>admin</option>
            <option value="storekeeper" selected={recipientGroupFilter === 'storekeeper'}>storekeeper</option>
          </select>
        </div>

        <button
          onClick={fetchRequests}
          className={styles.refreshBtn}
          disabled={loading}
        >
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
            <div
              key={request.id}
              className={`${styles.requestCard} ${statusColors[request.status] || ''}`}
            >
              <div className={styles.requestHeader}>
                <span className={styles.requestStatusIcon}>📋</span>
                <div className={styles.requestInfo}>
                  <div className={styles.requestTitle}>{request.title}</div>
                  <div className={styles.requestMeta}>
                    <span>{request.sender_name || '—'}</span>
                    <span>→ {request.recipient_group}</span>
                    <span>Кабинет: {request.classroom_number || '—'}</span>
                  </div>
                </div>
              </div>
              <div className={request.admin_comment ? 'has-comment' : ''}>
                <p className={styles.requestDescription}>
                  {request.description}
                </p>
              </div>
              <div className={styles.requestActions}>
                {request.canEdit ? (
                  <>
                    <button
                      className={styles.actionBtn}
                      onClick={() => {}}
                    >
                      Изменить статус
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => {}}
                    >
                      Комментарий
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}