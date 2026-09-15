import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { userService } from '../../services/api'
import styles from './UsersManagement.module.css'

const roleNames = {
  admin: 'Администратор',
  headmaster: 'Руководитель',
  deputy: 'Заместитель',
  teacher: 'Учитель',
  tech: 'Техник',
  storekeeper: 'Складской',
}

const roleOptions = [
  { value: 'admin', label: 'Администратор' },
  { value: 'headmaster', label: 'Руководитель' },
  { value: 'deputy', label: 'Заместитель' },
  { value: 'teacher', label: 'Учитель' },
  { value: 'tech', label: 'Техник' },
  { value: 'storekeeper', label: 'Складской работник' },
]

function getInitials(fullName) {
  if (!fullName) return '?'
  return fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function UsersManagement() {
  const { token, user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    role: 'teacher',
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const data = await userService.getAllUsers(token)
      setUsers(data)
    } catch (error) {
      toast.error('Ошибка загрузки пользователей')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      if (editingUser) {
        const { password, ...updateData } = formData
        if (!password) delete updateData.password

        await userService.updateUser(editingUser.id, updateData, token)
        toast.success('Пользователь обновлён')
      } else {
        await userService.createUser(formData, token)
        toast.success('Пользователь создан')
      }

      setShowModal(false)
      setEditingUser(null)
      setFormData({
        username: '',
        password: '',
        email: '',
        fullName: '',
        role: 'teacher',
      })
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка сохранения')
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      fullName: user.full_name,
      role: user.role,
    })
    setShowModal(true)
  }

  const handleDelete = async (user) => {
    if (!confirm(`Удалить пользователя ${user.full_name}?`)) return

    try {
      await userService.deleteUser(user.id, token)
      toast.success('Пользователь удалён')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка удаления')
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      password: '',
      email: '',
      fullName: '',
      role: 'teacher',
    })
    setShowModal(true)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Управление пользователями</h1>
          <button className={styles.addBtn} onClick={openCreateModal}>
            <span>+</span>
            <span>Добавить пользователя</span>
          </button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Email</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>Загрузка...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    Нет пользователей. Создайте первого!
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {getInitials(user.full_name)}
                        </div>
                        <div className={styles.userDetails}>
                          <span className={styles.userName}>{user.full_name}</span>
                          <span className={styles.userEmail}>{user.username}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                        {roleNames[user.role] || user.role}
                      </span>
                    </td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${user.is_active ? styles.active : styles.inactive}`}>
                        {user.is_active ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.actionBtn}
                          onClick={() => handleEdit(user)}
                          title="Редактировать"
                        >
                          ✏️
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            className={`${styles.actionBtn} ${styles.delete}`}
                            onClick={() => handleDelete(user)}
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingUser ? 'Редактировать пользователя' : 'Новый пользоват��ль'}</h2>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label>Полное имя</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="Иванов Иван Иванович"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Имя пользователя</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="ivanov"
                    required
                    disabled={editingUser}
                  />
                </div>

                {!editingUser && (
                  <div className={styles.formGroup}>
                    <label>Пароль</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Минимум 6 символов"
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>
                )}

                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ivanov@school.ru"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Роль</label>
                  <select
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                  >
                    {roleOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingUser ? 'Сохранить' : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}