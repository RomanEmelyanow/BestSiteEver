import { useState, useEffect } from 'react'
import { authService } from '../../services/api'
import toast from 'react-hot-toast'
import styles from './RequestForm.module.css'

export default function RequestForm({ isOpen, onClose, onSubmitSuccess, userClassrooms, token }) {
  const [formData, setFormData] = useState({
    classroomId: '',
    recipientGroup: 'admin',
    title: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  // Сбрасываем форму при открытии
  useEffect(() => {
    if (isOpen) {
      setFormData({
        classroomId: userClassrooms.length > 0 ? userClassrooms[0].id : '',
        recipientGroup: 'admin',
        title: '',
        description: '',
      })
      setErrors({})
    }
  }, [isOpen, userClassrooms])

  const validateForm = () => {
    const newErrors = {}
    if (!formData.classroomId) newErrors.classroomId = 'Выберите кабинет'
    if (!formData.title.trim()) newErrors.title = 'Заголовок обязателен'
    else if (formData.title.trim().length < 5) newErrors.title = 'Заголовок минимум 5 символов'
    if (!formData.description.trim()) newErrors.description = 'Описание обязательно'
    else if (formData.description.trim().length < 10) newErrors.description = 'Описание минимум 10 символов'
    if (!['admin', 'storekeeper'].includes(formData.recipientGroup)) newErrors.recipientGroup = 'Выберите группу получателя'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      await authService.createRequest(formData, token)
      toast.success('Заявка успешно создана')
      onSubmitSuccess()
      onClose()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Ошибка при создании заявки')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Создать заявку</h2>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="classroomId">Кабинет</label>
            <select
              id="classroomId"
              name="classroomId"
              value={formData.classroomId}
              onChange={handleChange}
              className={errors.classroomId ? styles.error : ''}
              required
            >
              <option value="">Выберите кабинет</option>
              {userClassrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.number}
                </option>
              ))}
            </select>
            {errors.classroomId && <span className={styles.errorText}>{errors.classroomId}</span>}
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
            <label htmlFor="title">Заголовок</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Краткое описание проблемы"
              className={errors.title ? styles.error : ''}
              maxLength={100}
            />
            {errors.title && <span className={styles.errorText}>{errors.title}</span>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="description">Описание</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Подробное описание заявки..."
              className={errors.description ? styles.error : ''}
              rows={5}
              maxLength={1000}
            />
            {errors.description && <span className={styles.errorText}>{errors.description}</span>}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Отмена
            </button>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}