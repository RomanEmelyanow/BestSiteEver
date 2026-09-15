import { useState } from 'react'
import axios from 'axios'
import styles from './AuditLog.module.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    dateFrom: '',
    dateTo: '',
  })

  // Загружаем логи при монтировании
  const token = localStorage.getItem('token')

  useState(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/audit/logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filters,
      })
      setLogs(response.data)
    } catch (error) {
      console.error('Ошибка загрузки логов:', error)
    } finally {
      setLoading(false)
    }
  }

  const actionLabels = {
    CREATE_USER: 'Создание пользователя',
    UPDATE_USER: 'Обновление пользователя',
    DELETE_USER: 'Удаление пользователя',
    LOGIN: 'Вход в систему',
    LOGOUT: 'Выход из системы',
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Логи аудита</h1>
          <p>История действий пользователей в системе</p>
        </div>

        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label>Действие:</label>
            <select
              value={filters.action}
              onChange={e => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">Все действия</option>
              <option value="CREATE_USER">Создание пользователя</option>
              <option value="UPDATE_USER">Обновление пользователя</option>
              <option value="DELETE_USER">Удаление пользователя</option>
              <option value="LOGIN">Вход</option>
              <option value="LOGOUT">Выход</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>С:</label>
            <input
              type="datetime-local"
              value={filters.dateFrom}
              onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
            />
          </div>

          <div className={styles.filterGroup}>
            <label>По:</label>
            <input
              type="datetime-local"
              value={filters.dateTo}
              onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
            />
          </div>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Детали</th>
                <th>IP-адрес</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>Загрузка...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Нет записей аудита
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>{formatDate(log.created_at)}</td>
                    <td>{log.user_id || 'Система'}</td>
                    <td>
                      <span className={`${styles.actionBadge} ${styles[log.action] || styles.default}`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className={styles.details}>
                      <code>{log.details || '—'}</code>
                    </td>
                    <td>{log.ip_address || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}