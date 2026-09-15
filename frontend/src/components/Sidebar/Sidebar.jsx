import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import styles from './Sidebar.module.css'

const navItems = [
  {
    title: 'Основное',
    items: [
      { path: '/admin', label: 'Панель управления', icon: '📊' },
      { path: '/admin/users', label: 'Пользователи', icon: '👥' },
      { path: '/admin/audit', label: 'Логи аудита', icon: '📋' },
    ],
  },
  {
    title: 'Заявки',
    items: [
      { path: '/admin/requests', label: 'Входящие заявки', icon: '📝' },
      { path: '/admin/requests/history', label: 'История заявок', icon: '📜' },
    ],
  },
  {
    title: 'Кабинеты',
    items: [
      { path: '/admin/classrooms', label: 'Управление кабинетами', icon: '🚪' },
    ],
  },
  {
    title: 'Настройки',
    items: [
      { path: '/admin/settings', label: 'Системные настройки', icon: '⚙️' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div style={{ fontSize: 'var(--font-size-2xl)' }}>🏫</div>
        <div className={styles.logoText}>Администрирование</div>
      </div>

      {user && (
        <div className={styles.userInfo}>
          <div style={{ width: 40, height: 40, background: 'var(--gradient-purple)', borderRadius: '50%' }}></div>
          <div>
            <h3>{user.fullName}</h3>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        </div>
      )}

      <nav>
        {navItems.map((section) => (
          <div key={section.title} className={styles.navSection}>
            <h4>{section.title}</h4>
            <ul className={styles.navList}>
              {section.items.map((item) => (
                <li key={item.path} className={styles.navItem}>
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `${styles.navLink} ${isActive ? styles.active : ''}`
                    }
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutBtn}>
          <span>🚪</span>
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  )
}