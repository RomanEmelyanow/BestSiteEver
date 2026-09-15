import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      flexDirection: 'column',
      gap: 'var(--spacing-md)',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <h1 style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700 }}>404</h1>
      <p style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--spacing-lg)' }}>
        Страница не найдена
      </p>
      <Link to="/login">
        <button style={{
          padding: 'var(--spacing-md) var(--spacing-lg)',
          background: 'var(--gradient-purple)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          Вернуться на главную
        </button>
      </Link>
    </div>
  )
}