import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
