import { Navigate } from 'react-router-dom'
import { adminAuthService } from '../../services/adminAuthService'
import { ROUTES } from '../../constants'

interface AdminAuthGuardProps { children: React.ReactNode; fallbackPath?: string }

export function AdminAuthGuard({ children, fallbackPath = ROUTES.ADMIN_LOGIN }: AdminAuthGuardProps) {
  const currentAdmin = adminAuthService.getCurrentAdmin()
  if (!currentAdmin) return <Navigate to={fallbackPath} replace />
  return <>{children}</>
}

