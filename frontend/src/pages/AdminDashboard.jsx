import { Routes, Route } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import Dashboard from '../components/Dashboard/Dashboard'
import UsersManagement from '../components/Users/UsersManagement'
import AuditLog from '../components/Audit/AuditLog'
import RequestList from '../components/Requests/RequestList'
import RequestHistory from '../components/Requests/RequestHistory'
import ClassroomsManagement from '../components/Classrooms/ClassroomsManagement'

export default function AdminDashboard() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<UsersManagement />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/requests" element={<RequestList />} />
        <Route path="/requests/history" element={<RequestHistory />} />
        <Route path="/classrooms" element={<ClassroomsManagement />} />
        <Route path="/settings" element={<div style={{ padding: 'var(--spacing-xl)', flex: 1 }}>Настройки (в разработке)</div>} />
      </Routes>
    </div>
  )
}