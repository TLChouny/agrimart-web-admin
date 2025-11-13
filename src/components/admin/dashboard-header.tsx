import { Bell } from "lucide-react"
import { Button } from "../ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { useAuth } from "../../contexts/AuthContext"
import adminAvatar from "../../../public/assets/admin-86irejDo.jpg"

export function DashboardHeader() {
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
          </div>
        </div>

        <div className="flex items-center gap-4">
        
          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={adminAvatar} />
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="text-sm">
              <p className="font-medium">{displayName}</p>  
              <p className="text-gray-500">{displayEmail}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default DashboardHeader

