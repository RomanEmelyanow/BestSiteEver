import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { userService } from '../../services/api'
import styles from './Dashboard.module.css'

const roleStats = {
  admin: { icon: '👑', color: '#7c3aed', name: 'Администраторы' },
  headmaster: { icon: '🎓', color: '#10b981', name: 'Руководители' },
  deputy: { icon: '📚', color: '#3b82f6', name: 'Заместители' },
  teacher: { icon: '🧑‍🏫', color: '#8b5cf6', name: 'Учителя' },
  tech: { icon: '🔧', color: '#f59e0b', name: 'Технический персонал' },
  storekeeper: { icon: '📦', color: '#14b8a6', name: 'Складские работники' },
}

export default function Dashboard() {
  const { user, token } = useAuth()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    roles: {},
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const users = await userService.getAllUsers(token)

      const totalUsers = users.length
      const activeUsers = users.filter(u => u.is_active).length

      const roleCounts = {}
      users.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1
      })

      const recentActivity = users
        .slice(0, 5)
        .map(user => ({
          title: `Создан пользователь ${user.full_name}`,
          description: `Роль: ${roleStats[user.role]?.name || user.role}`,
          time: 'Недавно',
          icon: '👤',
        }))

      setStats({
        totalUsers,
        activeUsers,
        roles: roleCounts,
        recentActivity,
      })
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.mainContent}>
          <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
            <div className={styles.loadingCard} style={{ height: 40 }}></div>
            <div className={styles.loadingCard} style={{ height: 120 }}></div>
            <div className={styles.loadingCard} style={{ height: 200 }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Панель управления</h1>
          <p>Обзор системы управления пользователями школы</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ background: 'var(--gradient-purple)' }}
            >
              👥
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Всего пользователей</div>
              <div className={styles.statValue}>{stats.totalUsers}</div>
              <div className={`${styles.statChange} ${stats.totalUsers > 0 ? styles.positive : ''}`}>
                {stats.totalUsers > 0 ? '↗ Активен' : 'Пока нет пользователей'}
              </div>
            </div>
          </div>

          <div className={styles.statCard}>
            <div
              className={styles.statIcon}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}
            >
              ✅
            </div>
            <div className={styles.statContent}>
              <div className={styles.statTitle}>Активных пользователей</div>
              <div className={styles.statValue}>{stats.activeUsers}</div>
              <div className={`${styles.statChange} ${stats.activeUsers > 0 ? styles.positive : ''}`}>
                {stats.activeUsers > 0 ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% активны` : 'Нет активных'}
              </div>
            </div>
          </div>

          {Object.entries(stats.roles).slice(0, 2).map(([role, count]) => {
            const roleConfig = roleStats[role]
            return (
              <div key={role} className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{ background: `linear-gradient(135deg, ${roleConfig?.color} 0%, ${roleConfig?.color}80 100%)` }}
                >
                  {roleConfig?.icon || '👤'}
                </div>
                <div className={styles.statContent}>
                  <div className={styles.statTitle}>{roleConfig?.name || role}</div>
                  <div className={styles.statValue}>{count}</div>
                  <div className={`${styles.statChange} ${count > 0 ? styles.positive : ''}`}>
                    {Math.round((count / stats.totalUsers) * 100)}% от общего числа
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.recentActivity}>
          <div className={styles.sectionHeader}>
            <h2>Недавние действия</h2>
            <button className={styles.viewAllBtn}>
              Смотреть все
            </button>
          </div>

          {stats.recentActivity.length > 0 ? (
            <ul className={styles.activityList}>
              {stats.recentActivity.map((activity, index) => (
                <li key={index} className={styles.activityItem}>
                  <div className={styles.activityIcon}>{activity.icon}</div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityTitle}>{activity.title}</div>
                    <div className={styles.activityMeta}>
                      <span>{activity.description}</span>
                      <span className={styles.activityTime}>{activity.time}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <h3>Нет активности</h3>
              <p>Когда пользователи будут созданы, они появятся здесь</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}