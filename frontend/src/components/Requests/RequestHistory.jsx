import { useState, useEffect } from 'react'
import { authService } from '../../services/api'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import styles from './RequestHistory.module.css'

export default function RequestHistory() {
  const { user, token } = useAuth()
  const { user_id: userId } = useParams()
  const { navigate } = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [userToViewId, setUserToViewId] = useState(null)

  useEffect(() => {
    // Если указан ID пользователя - показываем его историю
    if (userId) {
      fetchHistory(userId)
    } else {
      // Иначе показываем свою историю
      fetchHistory(user?.id || null)
    }
  }, [token, userId, user?.id])

  const fetchHistory = async (targetUserId) => {
    if (!targetUserId) return
    setLoading(true)
    try {
      const response = await authService.getRequestHistory(targetUserId, token)
      setRequests(response)
    } catch (error) {
      console.error('Error fetching request history:', error)
      toast.error('Не удалось загрузить историю заявок')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>История заявок</h2>
        {userId && userId !== (user?.id || '') ? (
          <p>История пользователя ID: {userId}</p>
        ) : null}
        <button
          onClick={() => setUserToViewId(null)}
          className={styles.closeBtn}
        >
          ← Назад
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка истории...</div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Заявок нет</p>
        </div>
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => (
            <div
              key={request.id}
              className={`${styles.requestCard} ${request.status === 'pending' ? 'bg-green-100' : ''}`}
            >
              <div className={styles.requestHeader}>
                <span className={styles.statusDot} style={{ background: request.status === 'pending' ? 'green' : 'gray' }} />
                <div className={styles.requestMeta}>
                  <div className={styles.requestTitle}>{request.title}</div>
                  <div className={styles.requestTime}>
                    {new Date(request.created_at).toLocaleDateString('ru-RU', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              </div>
              <p className={styles.requestDescription}>
                {request.description}
              </p>
              <div className={styles.requestFooter}>
                <span>Статус: {request.status}</span>
                <span>Кабинет: {request.classroom_number || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}