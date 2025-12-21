import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useAuth } from "../../contexts/AuthContext"
import adminAvatar from "../../../public/assets/admin-86irejDo.jpg"
import { AdminNotificationBell } from "./AdminNotificationBell"
import { Menu } from "lucide-react"
import { Button } from "../ui/button"

interface DashboardHeaderProps {
  onMenuClick?: () => void
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const { user } = useAuth()

  const getInitials = (name: string | undefined) => {
    if (!name) return 'AD'
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const displayName = user?.name || 'Admin'
  const displayEmail = user?.email || 'admin@agrimart.com'

  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        <div className="flex-1 max-w-md">
          <div className="relative">
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          {/* Notification Bell với SignalR */}
          <AdminNotificationBell />

          <div className="flex items-center gap-2 sm:gap-3">
            <Avatar className="w-7 h-7 sm:w-8 sm:h-8">
              <AvatarImage src={adminAvatar} />
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block text-sm">
              <p className="font-medium truncate max-w-[120px] md:max-w-none">{displayName}</p>  
              <p className="text-gray-500 text-xs truncate max-w-[120px] md:max-w-none">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader

