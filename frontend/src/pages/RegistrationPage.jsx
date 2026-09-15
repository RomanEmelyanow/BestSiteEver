import { useState, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authService } from '../services/api'
import toast from 'react-hot-toast'
import styles from './RegistrationPage.module.css'

export default function RegistrationPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    selectedClassrooms: [],
    recipientGroup: 'admin',
  })
  const [availableClassrooms, setAvailableClassrooms] = useState([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Если пользователь уже залогинен, перенаправляем на главную
  if (user) {
    return <Navigate to="/admin" replace />
  }

  useEffect(() => {
    // Загружаем список кабинетов при монтировании
    fetchClassrooms()
  }, [])

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
    if (!formData.fullName.trim()) newErrors.fullName = 'Полное имя обязательно'
    if (!formData.password) newErrors.password = 'Пароль обязателен'
    else if (formData.password.length < 6) newErrors.password = 'Пароль минимум 6 символов'
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Пароли не совпадают'
    if (formData.selectedClassrooms.length === 0) newErrors.classrooms = 'Выберите хотя бы один кабинет'
    if (!['admin', 'storekeeper'].includes(formData.recipientGroup)) newErrors.recipientGroup = 'Выберите группу получателя'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // Имя пользователя генерируем из fullName (transliterated)
      const username = generateUsername(formData.fullName)

      await authService.registerRequest({
        username,
        password: formData.password,
        fullName: formData.fullName,
        classroomIds: formData.selectedClassrooms,
        recipientGroup: formData.recipientGroup,
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

  const handleClassroomToggle = (classroomId) => {
    setFormData(prev => ({
      ...prev,
      selectedClassrooms: prev.selectedClassrooms.includes(classroomId)
        ? prev.selectedClassrooms.filter(id => id !== classroomId)
        : [...prev.selectedClassrooms, classroomId]
    }))
    if (errors.classrooms) setErrors(prev => ({ ...prev, classrooms: '' }))
  }

  const groupClassroomsByFloor = (classrooms) => {
    const floors = { '100-150': [], '200-250': [], '300-350': [] }
    classrooms.forEach(c => {
      const num = parseInt(c.number)
      if (num >= 100 && num <= 150) floors['100-150'].push(c)
      else if (num >= 200 && num <= 250) floors['200-250'].push(c)
      else if (num >= 300 && num <= 350) floors['300-350'].push(c)
    })
    return floors
  }

  const groupedClassrooms = groupClassroomsByFloor(availableClassrooms)

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
          <p>Подайте заявку на создание аккаанта. Доступ будет предоставлен после одобрения администратором.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
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
            <label>Кабинеты</label>
            <div className={styles.classroomSelector}>
              {Object.entries(groupedClassrooms).map(([floor, rooms]) => (
                <div key={floor} className={styles.floorGroup}>
                  <div className={styles.floorLabel}>Этаж {floor}</div>
                  <div className={styles.classroomGrid}>
                    {rooms.map(classroom => (
                      <label
                        key={classroom.id}
                        className={`${styles.classroomOption} ${
                          formData.selectedClassrooms.includes(classroom.id) ? styles.selected : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.selectedClassrooms.includes(classroom.id)}
                          onChange={() => handleClassroomToggle(classroom.id)}
                        />
                        <span>{classroom.number}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {errors.classrooms && <span className={styles.errorText}>{errors.classrooms}</span>}
          </div>

          <div className={styles.formGroup}>
            <label>Кому адресована заявка</label>
            <div className={styles.groupSelector}>
              <label className={`${styles.groupOption} ${formData.recipientGroup === 'admin' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="recipientGroup"
                  value="admin"
                  checked={formData.recipientGroup === 'admin'}
                  onChange={handleChange}
                />
                <span>Администрация</span>
              </label>
              <label className={`${styles.groupOption} ${formData.recipientGroup === 'storekeeper' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="recipientGroup"
                  value="storekeeper"
                  checked={formData.recipientGroup === 'storekeeper'}
                  onChange={handleChange}
                />
                <span>Завхоз</span>
              </label>
            </div>
            {errors.recipientGroup && <span className={styles.errorText}>{errors.recipientGroup}</span>}
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

// Генерация username из fullName (транслитерация)
function generateUsername(fullName) {
  const translitMap = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'c',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
    'я': 'ya', ' ': '_', '-': '_'
  }
  const lower = fullName.toLowerCase().trim()
  let result = ''
  for (const char of lower) {
    result += translitMap[char] || char
  }
  return result || 'user'
}
