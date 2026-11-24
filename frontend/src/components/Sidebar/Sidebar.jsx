import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ROLE_LABELS } from '../../utils/labels'
import {
  IconArchive,
  IconDashboard,
  IconInbox,
  IconLogout,
  IconSchool,
  IconSend,
  IconUsers,
} from '../Icons'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const isAdmin = user?.role === 'admin'
  const canReceiveRequests = user?.role === 'admin' || user?.role === 'storekeeper'

  const sections = [
    {
      title: 'Заявки',
      items: [
        ...(canReceiveRequests
          ? [
              { path: '/admin/requests/incoming', label: 'Входящие заявки', icon: <IconInbox /> },
            ]
          : []),
        { path: '/admin/requests/outgoing', label: 'Исходящие заявки', icon: <IconSend /> },
        ...(canReceiveRequests
          ? [{ path: '/admin/requests/archive', label: 'Архив', icon: <IconArchive /> }]
          : []),      ],
    },
    ...(isAdmin
      ? [
          {
            title: 'Управление',
            items: [
              { path: '/admin', label: 'Панель управления', icon: <IconDashboard /> },
              { path: '/admin/users', label: 'Пользователи', icon: <IconUsers /> },
            ],
          },
        ]
      : []),
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoBadge}>
          <IconSchool size={22} />
        </div>
        <div className={styles.logoText}>Школьный портал</div>
      </div>

      {user && (
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}></div>
          <div>
            <h3>{user.fullName}</h3>
            <span className={styles.userRole}>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
        </div>
      )}

      <nav>
        {sections.map((section) => (
          <div key={section.title} className={styles.navSection}>
            <h4>{section.title}</h4>
            <ul className={styles.navList}>
              {section.items.map((item) => (
                <li key={item.path} className={styles.navItem}>
                  <NavLink
                    to={item.path}
                    end={item.path === '/admin'}
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
          <IconLogout size={18} />
          <span>Выйти</span>
        </button>
      </div>
    </aside>
  )
}
