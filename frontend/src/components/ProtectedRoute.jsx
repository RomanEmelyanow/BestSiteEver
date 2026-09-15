import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="animate-pulse" style={{ fontSize: 'var(--font-size-lg)' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <h1>Доступ запрещен</h1>
        <p style={{ color: 'var(--text-tertiary)' }}>
          Эта страница доступна только для пользователей с ролью {requiredRole}
        </p>
      </div>
    )
  }

  return children
}