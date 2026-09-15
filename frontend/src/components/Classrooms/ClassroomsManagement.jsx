import { useState, useEffect } from 'react'
import { authService } from '../../services/api'
import { useAuth } from '../../hooks/useAuth'
import toast from 'react-hot-toast'
import styles from './ClassroomsManagement.module.css'

export default function ClassroomsManagement({ token }) {
  const { user } = useAuth()
  const [classrooms, setClassrooms] = useState([])
  const [userClassrooms, setUserClassrooms] = useState([])
  const [availableClassrooms, setAvailableClassrooms] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
      fetchAllClassrooms()
    } else {
      // Для обычных пользователей - только свои кабинеты
      setSelectedUserId(user?.id)
      fetchUserClassrooms(user?.id)
      fetchAvailableClassrooms(user?.id)
    }
  }, [user?.id, token])

  const fetchUsers = async () => {
    try {
      const response = await authService.getAllUsers(token)
      setUsers(response)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchAllClassrooms = async () => {
    try {
      const response = await authService.getClassrooms(token)
      setClassrooms(response)
    } catch (error) {
      console.error('Error fetching classrooms:', error)
    }
  }

  const fetchUserClassrooms = async (userId) => {
    try {
      const response = await authService.getUserClassrooms(userId, token)
      setUserClassrooms(response)
    } catch (error) {
      console.error('Error fetching user classrooms:', error)
      toast.error('Не удалось загрузить кабинеты пользователя')
    }
  }

  const fetchAvailableClassrooms = async (userId) => {
    try {
      const response = await authService.getAvailableClassrooms(userId, token)
      setAvailableClassrooms(response)
    } catch (error) {
      console.error('Error fetching available classrooms:', error)
      toast.error('Не удалось загрузить доступные кабинеты')
    }
  }

  const handleAssignClassroom = async (classroomId) => {
    try {
      await authService.assignUserClassroom(selectedUserId, classroomId, token)
      toast.success('Кабинет назначен')
      fetchUserClassrooms(selectedUserId)
      fetchAvailableClassrooms(selectedUserId)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при назначении кабинета')
    }
  }

  const handleRemoveClassroom = async (classroomId) => {
    try {
      await authService.removeUserClassroom(selectedUserId, classroomId, token)
      toast.success('Кабинет снят')
      fetchUserClassrooms(selectedUserId)
      fetchAvailableClassrooms(selectedUserId)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при снятии кабинета')
    }
  }

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId)
    fetchUserClassrooms(userId)
    fetchAvailableClassrooms(userId)
  }

  if (loading) {
    return <div className={styles.loading}>Загрузка...</div>
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Управление кабинетами</h2>
        {user?.role === 'admin' && (
          <select
            value={selectedUserId || ''}
            onChange={(e) => handleUserSelect(e.target.value ? parseInt(e.target.value) : null)}
            className={styles.userSelect}
          >
            <option value="">Выберите пользователя</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedUserId ? (
        <div className={styles.content}>
          <div className={styles.section}>
            <h3>Назначенные кабинеты</h3>
            {userClassrooms.length === 0 ? (
              <p className={styles.empty}>Нет назначенных кабинетов</p>
            ) : (
              <div className={styles.classroomGrid}>
                {userClassrooms.map(uc => (
                  <div key={uc.id} className={styles.classroomItem}>
                    <span className={styles.classroomNumber}>{uc.number}</span>
                    <button
                      onClick={() => handleRemoveClassroom(uc.id)}
                      className={styles.removeBtn}
                      title="Снять кабинет"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h3>Доступные кабинеты</h3>
            {availableClassrooms.length === 0 ? (
              <p className={styles.empty}>Нет доступных кабинетов</p>
            ) : (
              <div className={styles.classroomGrid}>
                {availableClassrooms.map(c => (
                  <button
                    key={c.id}
                    onClick={() => handleAssignClassroom(c.id)}
                    className={styles.availableClassroom}
                  >
                    {c.number}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Выберите пользователя для управления его кабинетами</p>
        </div>
      )}
    </div>
  )
}