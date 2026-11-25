import { Navigate, Routes, Route } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Sidebar from '../components/Sidebar/Sidebar'
import Dashboard from '../components/Dashboard/Dashboard'
import UsersManagement from '../components/Users/UsersManagement'
import RequestIncoming from '../components/Requests/RequestIncoming'
import RequestArchive from '../components/Requests/RequestArchive'
import RequestOutgoing from '../components/Requests/RequestOutgoing'
import TeacherOutgoing from '../components/Requests/TeacherOutgoing'
import AdministrationOutgoing from '../components/Requests/AdministrationOutgoing'

export default function AdminDashboard() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canReceiveRequests = user?.role === 'admin' || user?.role === 'storekeeper'
  const outgoingPanel =
    user?.role === 'teacher' ? (
      <TeacherOutgoing />
    ) : user?.role === 'administration' ? (
      <AdministrationOutgoing />
    ) : (
      <RequestOutgoing />
    )

  return (
    <div className="portal-layout">
      <Sidebar />

      <Routes>
        <Route
          index
          element={<Navigate to={canReceiveRequests ? "/admin/requests/incoming" : "/admin/requests/outgoing"} replace />}
        />
        <Route
          path="dashboard"
          element={isAdmin ? <Dashboard /> : <Navigate to="/admin/requests/outgoing" replace />}
        />
        <Route
          path="/users"
          element={isAdmin ? <UsersManagement /> : <Navigate to="/admin/requests/outgoing" replace />}
        />
        <Route
          path="/requests/incoming"
          element={canReceiveRequests ? <RequestIncoming /> : <Navigate to="/admin/requests/outgoing" replace />}
        />
        <Route
          path="/requests/archive"
          element={canReceiveRequests ? <RequestArchive /> : <Navigate to="/admin/requests/outgoing" replace />}
        />
        <Route path="/requests/outgoing" element={outgoingPanel} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </div>
  )
}
