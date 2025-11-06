import { StatsCards } from "../../components/admin/stats-cards"
import { RevenueAnalytics } from "../../components/admin/revenue-analytics"
import { DeliveryInfo } from "../../components/admin/delivery-info"
import { ShippingInfo } from "../../components/admin/shipping-info"
import { Button } from "../../components/ui/button"
import { Download } from "lucide-react"

export default function AdminDashboardPage() {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển</h1>
          <p className="text-gray-600">Quản lý nông trại, đơn hàng và người dùng một cách hiệu quả.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <StatsCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-3">
          <RevenueAnalytics />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="space-y-6">
          <DeliveryInfo />
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white p-4 rounded-lg border border-gray-200 min-h-[570px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Hoạt động gần đây</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nông trại ABC đã được phê duyệt</p>
                  <p className="text-xs text-gray-500">2 giờ trước</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Đơn hàng #1234 đã giao thành công</p>
                  <p className="text-xs text-gray-500">4 giờ trước</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sản phẩm mới cần xét duyệt</p>
                  <p className="text-xs text-gray-500">6 giờ trước</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ShippingInfo />
      </div>
    </>
  )
}

