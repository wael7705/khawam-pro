import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated, getUserData, isAdmin, isEmployee } from '../lib/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('مدير' | 'موظف' | 'عميل')[]
  requireAuth?: boolean
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles,
  requireAuth = true 
}: ProtectedRouteProps) {
  const location = useLocation()
  const authenticated = isAuthenticated()
  const user = getUserData()

  // If authentication is required and user is not authenticated
  if (requireAuth && !authenticated) {
    // Redirect to login with return URL
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
  }

  // If user is authenticated but no specific roles required, allow access
  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>
  }

  // Check if user has required role
  if (user && allowedRoles.includes(user.user_type.name_ar as any)) {
    return <>{children}</>
  }

  // User doesn't have required role - redirect to home or appropriate page
  if (isAdmin()) {
    return <Navigate to="/dashboard" replace />
  }
  
  if (isEmployee()) {
    return <Navigate to="/dashboard/orders" replace />
  }

  // Default: redirect to home
  return <Navigate to="/" replace />
}

