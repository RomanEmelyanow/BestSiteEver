import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login, user } = useAuth()
  const navigate = useNavigate()

  if (user) return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!username || !password) {
      toast.error('Заполните все поля')
      return
    }

    setIsLoading(true)
    try {
      const result = await login(username, password)

      if (result.success) {
        toast.success('Добро пожаловать!')
        navigate('/admin')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error('Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Администрирование</h1>
          <p>Внутренняя система управления школой</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              type="text"
              placeholder="Введите ваше имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              type="password"
              placeholder="Введите ваш пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        <div className={styles.footer}>
          <p style={{ fontSize: 'var(--font-size-sm)' }}>
            Еще нет аккаунта? <Link to="/register" style={{ color: 'var(--purple-light)', textDecoration: 'none' }}>Зарегистрируйтесь</Link>
          </p>
        </div>
      </div>

      {/* Декоративные элементы */}
      <div className={styles.decoration}></div>
    </div>
  )
}
