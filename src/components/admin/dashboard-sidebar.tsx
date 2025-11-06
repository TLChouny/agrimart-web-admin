function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" ") }
import type { LucideIcon } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, CheckCircle, Wheat, ShoppingCart, Truck, Settings, HelpCircle, LogOut } from "lucide-react"
import { adminAuthService } from "../../services/adminAuthService"
import { useAuth } from "../../contexts/AuthContext"
import { ROUTES } from "../../constants"

type MenuItem = { icon: LucideIcon; label: string; path: string; badge?: string }

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", path: "/admin" },
  { icon: Users, label: "Người dùng", path: "/admin/users" },
  { icon: CheckCircle, label: "Xét duyệt", path: "/admin/approval" },
  { icon: Wheat, label: "Nông trại", path: "/admin/farms" },
  { icon: Truck, label: "Phiên đấu giá", path: "/admin/auctions" },
  { icon: ShoppingCart, label: "Đơn hàng", path: "/admin/orders" },
]

const generalItems = [
  { icon: Settings, label: "Cài đặt", path: "/admin/settings" },
  { icon: HelpCircle, label: "Hỗ trợ", path: "/admin/help" },
]

export function DashboardSidebar() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    try {
      await adminAuthService.logout()
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('currentUser')
      signOut()
    } finally {
      navigate(ROUTES.ADMIN_LOGIN)
    }
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <Wheat className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">AgriMart Admin</span>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">MENU</p>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex w-full items-center gap-3 h-10 rounded-md px-3 text-sm",
                    isActive ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">GENERAL</p>
          <nav className="space-y-1">
            {generalItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    "flex w-full items-center gap-3 h-10 rounded-md px-3 text-sm",
                    isActive ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-100"
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className={cn("flex w-full items-center gap-3 h-10 rounded-md px-3 text-sm text-left", "text-gray-700 hover:bg-gray-100")}
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </nav>
        </div>
      </div>
    </div>
  )
}

export default DashboardSidebar

