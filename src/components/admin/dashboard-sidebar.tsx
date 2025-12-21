function cn(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(" ") }
import type { LucideIcon } from "lucide-react"
import { NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, CheckCircle, Wheat, Sprout, Tags, Truck, LogOut, Scissors, FileWarning, Wallet, ShieldAlert, FileText } from "lucide-react"
import { adminAuthService } from "../../services/adminAuthService"
import { useAuth } from "../../contexts/AuthContext"
import { ROUTES } from "../../constants"
import { useToastContext } from "../../contexts/ToastContext"
import { SUCCESS_MESSAGES, ERROR_MESSAGES, TOAST_TITLES } from "../../services/constants/messages"

type MenuItem = { icon: LucideIcon; label: string; path: string; badge?: string }

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Bảng điều khiển", path: "/admin" },
  { icon: Users, label: "Người dùng", path: "/admin/users" },
  { icon: CheckCircle, label: "Xét duyệt", path: "/admin/approval" },
  { icon: Tags, label: "Phân loại", path: "/admin/categories" },
  { icon: Wheat, label: "Nông trại", path: "/admin/farms" },
  { icon: Sprout, label: "Lô trồng", path: "/admin/crops" },
  { icon: Scissors, label: "Vụ trồng", path: "/admin/harvests" },
  // { icon: ShoppingBag, label: "Yêu cầu mua hàng", path: "/admin/buy-requests" },
  { icon: Truck, label: "Phiên đấu giá", path: "/admin/auctions" },
  { icon: FileWarning, label: "Báo cáo", path: "/admin/reports" },
  { icon: ShieldAlert, label: "Tranh chấp", path: "/admin/disputes" },
  // { icon: ShoppingCart, label: "Đơn hàng", path: "/admin/orders" },
  { icon: Wallet, label: "Ví của tôi", path: "/admin/wallet" },
  { icon: FileText, label: "Chính sách", path: "/admin/policy" },


]

interface DashboardSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export function DashboardSidebar({ isOpen = false, onClose }: DashboardSidebarProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { toast } = useToastContext()

  const handleLogout = async () => {
    try {
      await adminAuthService.logout()
      localStorage.removeItem('authToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('currentUser')
      toast({
        title: TOAST_TITLES.SUCCESS,
        description: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      })
    } catch (error) {
      toast({
        title: ERROR_MESSAGES.LOGOUT_FAILED_TITLE,
        description: ERROR_MESSAGES.LOGOUT_FAILED,
        variant: 'destructive',
      })
    } finally {
      signOut()
      navigate(ROUTES.ADMIN_LOGIN)
    }
  }

  const handleNavClick = () => {
    if (window.innerWidth < 1024 && onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 h-screen flex flex-col transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <img 
              src="/assets/logo.png" 
              alt="AgriMart Logo" 
              className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
            />
            <span className="font-semibold text-base sm:text-lg">AgriMart Admin</span>
          </div>
        </div>

        <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
          <div className="mb-6">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 px-2">Bảng điều khiển</p>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    cn(
                      "flex w-full items-center gap-2 sm:gap-3 h-9 sm:h-10 rounded-md px-2 sm:px-3 text-xs sm:text-sm",
                      isActive ? "bg-emerald-600 text-white" : "text-gray-700 hover:bg-gray-100"
                    )
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-emerald-100 text-emerald-800 text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full flex-shrink-0">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  "flex w-full items-center gap-2 sm:gap-3 h-9 sm:h-10 rounded-md px-2 sm:px-3 text-xs sm:text-sm text-left",
                  "text-gray-700 hover:bg-gray-100"
                )}
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Đăng xuất</span>
              </button>
            </nav>
          </div>
        </div>
      </div>
    </>
  )
}

export default DashboardSidebar

