import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { userService, authService } from '../../services/api'
import { ROLE_LABELS, ROLE_OPTIONS } from '../../utils/labels'
import { useConfirm } from '../../context/ConfirmContext'
import GlassSelect from '../GlassSelect'
import styles from './UsersManagement.module.css'

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
  const confirm = useConfirm()
  const [users, setUsers] = useState([])
  const [classrooms, setClassrooms] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [regRoles, setRegRoles] = useState({})
  const [approvingId, setApprovingId] = useState(null)
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
    fetchPendingRequests()
    fetchClassrooms()
  }, [])

  const fetchClassrooms = async () => {
    try {
      setClassrooms(await authService.getClassrooms(token))
    } catch (error) {
      toast.error('Ошибка загрузки кабинетов')
    }
  }

  const fetchPendingRequests = async () => {
    try {
      const data = await authService.getRegistrationRequests(token)
      setPendingRequests(data.filter(r => r.status === 'pending'))
    } catch (error) {
      toast.error('Ошибка загрузки заявок на регистрацию')
    }
  }

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
        const updateData = { ...formData }
        delete updateData.password

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
    const ok = await confirm({
      title: 'Удаление пользователя',
      message: `Удалить пользователя ${user.full_name}?`,
      confirmLabel: 'Удалить',
      danger: true,
    })
    if (!ok) return

    try {
      await userService.deleteUser(user.id, token)
      toast.success('Пользователь удалён')
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка удаления')
    }
  }

  const handleClassroomChange = async (user, value) => {
    try {
      await userService.setUserClassroom(user.id, value ? parseInt(value) : null, token)
      toast.success(`Кабинет пользователя ${user.full_name} обновлён`)
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка смены кабинета')
    }
  }

  const handleApprove = async (request) => {
    const role = regRoles[request.id] || 'teacher'
    setApprovingId(request.id)
    try {
      await authService.approveRegistrationRequest(request.id, role, token)
      toast.success(`Заявка ${request.username} одобрена, роль: ${ROLE_LABELS[role]}`)
      fetchPendingRequests()
      fetchUsers()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка одобрения')
    } finally {
      setApprovingId(null)
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

        {pendingRequests.length > 0 && (
          <div className={styles.pendingSection}>
            <h2 className={styles.pendingTitle}>Ожидают подтверждения</h2>
            {pendingRequests.map(request => (
              <div key={request.id} className={styles.pendingCard}>
                <div className={styles.pendingInfo}>
                  <span className={styles.pendingName}>{request.full_name}</span>
                  <span className={styles.pendingUsername}>{request.username}</span>
                  <span className={styles.pendingDate}>
                    {new Date(request.created_at).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className={styles.pendingActions}>
                  <GlassSelect
                    className={styles.roleSelect}
                    value={regRoles[request.id] || 'teacher'}
                    onChange={value => setRegRoles(prev => ({ ...prev, [request.id]: value }))}
                    options={ROLE_OPTIONS}
                  />
                  <button
                    className={styles.approveBtn}
                    disabled={approvingId === request.id}
                    onClick={() => handleApprove(request)}
                  >
                    Подтвердить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Роль</th>
                <th>Кабинет</th>
                <th>Email</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>Загрузка...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    Нет пользователей. Создайте первого!
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td data-label="Пользователь">
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
                    <td data-label="Роль">
                      <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td data-label="Кабинет">
                      <GlassSelect
                        searchable
                        className={styles.classroomSelect}
                        value={user.classroom_id ? String(user.classroom_id) : ''}
                        onChange={value => handleClassroomChange(user, value)}
                        options={[
                          { value: '', label: 'Без кабинета' },
                          ...classrooms.map(c => ({ value: String(c.id), label: c.number })),
                        ]}
                      />
                    </td>
                    <td data-label="Email">{user.email || '—'}</td>
                    <td data-label="Статус">
                      <span className={`${styles.statusBadge} ${user.is_active ? styles.active : styles.inactive}`}>
                        {user.is_active ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td data-label="Действия">
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
              <h2>{editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}</h2>
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
                  <GlassSelect
                    value={formData.role}
                    onChange={value => setFormData({ ...formData, role: value })}
                    options={ROLE_OPTIONS}
                  />
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
