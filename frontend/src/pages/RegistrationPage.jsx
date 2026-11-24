import { useState, useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/api'
import toast from 'react-hot-toast'
import styles from './RegistrationPage.module.css'

export default function RegistrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    selectedClassroom: null,
  })
  const [availableClassrooms, setAvailableClassrooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [classroomsOpen, setClassroomsOpen] = useState(false)
  const [classroomSearch, setClassroomSearch] = useState('')
  const classroomsRef = useRef(null)

  useEffect(() => {
    fetchClassrooms()
  }, [])

  useEffect(() => {
    const onClickOutside = (event) => {
      if (classroomsRef.current && !classroomsRef.current.contains(event.target)) {
        setClassroomsOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  // Если пользователь уже залогинен, перенаправляем на главную
  if (user) {
    return <Navigate to="/admin" replace />
  }

  const fetchClassrooms = async () => {
    try {
      // For registration, fetch classrooms without authentication
      const response = await fetch('/api/classrooms')
      if (response.ok) {
        const classrooms = await response.json()
        setAvailableClassrooms(classrooms)
      } else {
        throw new Error('Failed to fetch classrooms')
      }
    } catch (error) {
      console.error('Error fetching classrooms:', error)
      toast.error('Не удалось загрузить список кабинетов')
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.username.trim()) newErrors.username = 'Логин обязателен'
    if (!formData.fullName.trim()) newErrors.fullName = 'Полное имя обязательно'
    if (!formData.password) newErrors.password = 'Пароль обязателен'
    else if (formData.password.length < 6) newErrors.password = 'Пароль минимум 6 символов'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      await authService.registerRequest({
        username: formData.username.trim(),
        password: formData.password,
        fullName: formData.fullName,
        classroomIds: formData.selectedClassroom ? [formData.selectedClassroom] : [],
      })
      toast.success('Заявка отправлена! Ожидайте одобрения администратором.')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при отправке заявки')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const selectClassroom = (classroomId) => {
    setFormData(prev => ({ ...prev, selectedClassroom: classroomId }))
    setClassroomsOpen(false)
    setClassroomSearch('')
    if (errors.classrooms) setErrors(prev => ({ ...prev, classrooms: '' }))
  }

  const sortedClassrooms = [...availableClassrooms].sort(
    (a, b) => (parseInt(a.number) || 0) - (parseInt(b.number) || 0)
  )
  const visibleClassrooms = sortedClassrooms.filter(c => c.number.includes(classroomSearch.trim()))
  const selectedClassroom = sortedClassrooms.find(c => c.id === formData.selectedClassroom)
  const classroomsLabel = selectedClassroom ? selectedClassroom.number : 'Не выбран (необязательно)'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>Регистрация</h1>
          <p>Подайте заявку на создание аккаунта. Доступ будет предоставлен после одобрения администратором.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="username">Логин</label>
            <input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              placeholder="ivanov"
              className={errors.username ? styles.error : ''}
              autoComplete="username"
            />
            {errors.username && <span className={styles.errorText}>{errors.username}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="fullName">Полное имя</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Иванов Иван Иванович"
              className={errors.fullName ? styles.error : ''}
              autoComplete="name"
            />
            {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="classrooms">Кабинет (необязательно)</label>
            <div className={styles.dropdown} ref={classroomsRef}>
              <button
                id="classrooms"
                type="button"
                className={`${styles.dropdownToggle} ${errors.classrooms ? styles.error : ''}`}
                onClick={() => setClassroomsOpen(prev => !prev)}
              >
                <span className={selectedClassroom ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {classroomsLabel}
                </span>
                <span className={styles.dropdownArrow}>{classroomsOpen ? '▲' : '▼'}</span>
              </button>

              {classroomsOpen && (
                <div className={styles.dropdownPanel}>
                  <input
                    type="text"
                    className={styles.dropdownSearch}
                    placeholder="Поиск по номеру"
                    value={classroomSearch}
                    onChange={(e) => setClassroomSearch(e.target.value)}
                    autoFocus
                  />
                  <div className={styles.dropdownList}>
                    {visibleClassrooms.length === 0 && (
                      <div className={styles.dropdownEmpty}>Ничего не найдено</div>
                    )}
                    {visibleClassrooms.map(classroom => {
                      const checked = formData.selectedClassroom === classroom.id
                      return (
                        <label
                          key={classroom.id}
                          className={`${styles.dropdownItem} ${checked ? styles.selected : ''}`}
                        >
                          <input
                            type="radio"
                            name="classroom"
                            checked={checked}
                            onChange={() => selectClassroom(classroom.id)}
                          />
                          <span>{classroom.number}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            {errors.classrooms && <span className={styles.errorText}>{errors.classrooms}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Минимум 6 символов"
              className={errors.password ? styles.error : ''}
              autoComplete="new-password"
            />
            {errors.password && <span className={styles.errorText}>{errors.password}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Повторите пароль"
              className={errors.confirmPassword ? styles.error : ''}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <span className={styles.errorText}>{errors.confirmPassword}</span>}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Отправка...' : 'Подать заявку'}
          </button>
        </form>

        <div className={styles.footer}>
          <p>Уже есть аккаунт? <a href="/login">Войти</a></p>
        </div>
      </div>
    </div>
  )
}
