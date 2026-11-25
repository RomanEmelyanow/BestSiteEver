import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../context/ConfirmContext'
import GlassSelect from '../GlassSelect'
import { authService, userService } from '../../services/api'
import styles from './Dashboard.module.css'

const roleStats = {
  admin: { icon: '👑', color: '#7c3aed', name: 'Администраторы' },
  teacher: { icon: '🧑‍🏫', color: '#8b5cf6', name: 'Учителя' },
  storekeeper: { icon: '📦', color: '#14b8a6', name: 'Складские работники' },
  administration: { icon: '🏫', color: '#3b82f6', name: 'Администрация школы' },
}

export default function Dashboard() {
  const { user, token } = useAuth()
  const confirm = useConfirm()
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    roles: {},
    recentUsers: [],
  })
  const [usersList, setUsersList] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [selectedClassroomId, setSelectedClassroomId] = useState('')
  const [newClassroomNumber, setNewClassroomNumber] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [users, classroomsData] = await Promise.all([
        userService.getAllUsers(token),
        authService.getClassrooms(token),
      ])

      const totalUsers = users.length
      const activeUsers = users.filter(u => u.is_active).length

      const roleCounts = {}
      users.forEach(user => {
        roleCounts[user.role] = (roleCounts[user.role] || 0) + 1
      })

      const recentUsers = users
        .slice(0, 5)
        .map(user => ({
          title: user.full_name,
          description: `Роль: ${roleStats[user.role]?.name || user.role}`,
          time: user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '',
          icon: '👤',
        }))

      setUsersList(users)
      setClassrooms(classroomsData)
      setSelectedClassroomId(prev =>
        classroomsData.some(c => String(c.id) === prev) ? prev : ''
      )
      setStats({
        totalUsers,
        activeUsers,
        roles: roleCounts,
        recentUsers,
      })
    } catch (error) {
      console.error('Ошибка загрузки данных:', error)
      toast.error(error.response?.data?.message || 'Не удалось загрузить панель управления')
    } finally {
      setLoading(false)
    }
  }

  const handleAddClassroom = async (e) => {
    e.preventDefault()
    const number = newClassroomNumber.trim()
    if (!number) return
    try {
      await authService.createClassroom(number, token)
      toast.success(`Кабинет ${number} добавлен`)
      setNewClassroomNumber('')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка добавления кабинета')
    }
  }

  const handleDeleteClassroom = async (classroom, assigned) => {
    const assignedNote = assigned.length > 0
      ? ` Он присвоен: ${assigned.map(u => u.full_name).join(', ')}. Привязка будет снята.`
      : ''
    const ok = await confirm({
      title: 'Удаление кабинета',
      message: `Удалить кабинет ${classroom.number}?${assignedNote}`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return
    try {
      await authService.deleteClassroom(classroom.id, token)
      toast.success(`Кабинет ${classroom.number} удалён`)
      setSelectedClassroomId('')
      fetchDashboardData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка удаления кабинета')
    }
  }

  const handleDeleteSelected = async () => {
    const classroom = classrooms.find(c => String(c.id) === selectedClassroomId)
    if (!classroom) return
    const assigned = usersList.filter(u => u.classroom_id === classroom.id)
    await handleDeleteClassroom(classroom, assigned)
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

          {Object.entries(stats.roles).map(([role, count]) => {
            const roleConfig = roleStats[role]
            const roleColor = roleConfig?.color || '#64748b'
            return (
              <div key={role} className={styles.statCard}>
                <div
                  className={styles.statIcon}
                  style={{ background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}80 100%)` }}
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
            <h2>Последние пользователи</h2>
          </div>

          {stats.recentUsers.length > 0 ? (
            <ul className={styles.activityList}>
              {stats.recentUsers.map((activity, index) => (
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
              <h3>Пользователей пока нет</h3>
              <p>Созданные учетные записи появятся здесь</p>
            </div>
          )}
        </div>

        {user?.role === 'admin' && (
          <div className={styles.classroomsSection}>
            <h2 className={styles.classroomTitle}>Кабинеты</h2>
            <div className={styles.classroomRow}>
              <GlassSelect
                searchable
                className={styles.classroomSelect}
                value={selectedClassroomId}
                onChange={setSelectedClassroomId}
                placeholder="Выберите кабинет"
                options={classrooms.map(c => {
                  const count = usersList.filter(u => u.classroom_id === c.id).length
                  return {
                    value: String(c.id),
                    label: count > 0 ? `${c.number} — назначен: ${count}` : c.number,
                  }
                })}
              />
              <button
                className={styles.deleteClassroomBtn}
                disabled={!selectedClassroomId}
                onClick={handleDeleteSelected}
              >
                Удалить
              </button>
              <form className={styles.addClassroomForm} onSubmit={handleAddClassroom}>
                <input
                  className={styles.addClassroomInput}
                  value={newClassroomNumber}
                  onChange={e => setNewClassroomNumber(e.target.value)}
                  placeholder="Номер кабинета"
                />
                <button type="submit" className={styles.viewAllBtn} disabled={!newClassroomNumber.trim()}>
                  Добавить
                </button>
              </form>
            </div>

            {classrooms.length === 0 && (
              <p className={styles.classroomHint}>
                Кабинетов пока нет — добавьте первый через форму справа
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
