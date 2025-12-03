import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { CalendarDays, User, Leaf, DollarSign } from "lucide-react"
import { Link } from "react-router-dom"
import type { OrderStatus, OrderPaymentInfo } from "../../types/api"
import { formatCurrencyVND } from "../../utils/currency"

export interface DeliverySummaryItem {
  id: string
  farm: string
  customer: string
  total: number
  status: OrderStatus
  createdAt: string
  payment: OrderPaymentInfo
}

interface DeliveryInfoProps {
  orders: DeliverySummaryItem[]
  isLoading?: boolean
}

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" })

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ xác nhận</Badge>
    case "confirmed":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Đã xác nhận</Badge>
    case "shipping":
      return <Badge variant="outline" className="text-purple-600 border-purple-600">Đang giao</Badge>
    case "delivered":
      return <Badge variant="outline" className="text-green-600 border-green-600">Đã giao</Badge>
    case "cancelled":
      return <Badge variant="outline" className="text-red-600 border-red-600">Đã hủy</Badge>
    default:
      return <Badge variant="outline">Đang cập nhật</Badge>
  }
}

function OrdersSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={`order-skeleton-${index}`} className="p-3 border rounded-lg animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-full bg-gray-200 rounded mb-2" />
          <div className="h-3 w-5/6 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

export function DeliveryInfo({ orders, isLoading }: DeliveryInfoProps) {
  const hasOrders = orders.length > 0

  return (
    <Card className="min-h-[260px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Tổng quan yêu cầu thu mua</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {isLoading ? (
            <OrdersSkeleton />
          ) : hasOrders ? (
            orders.map(order => (
              <div key={order.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="truncate">Khách: <span className="font-medium">{order.customer || "Chưa cập nhật"}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Leaf className="w-4 h-4 text-gray-400" />
                    <span className="truncate">Khu vực: <span className="font-medium">{order.farm || "Không rõ"}</span></span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span>
                      Tổng: <span className="font-medium text-green-600">{formatCurrencyVND(order.total)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <span>Ngày: <span className="font-medium">{formatDate(order.createdAt)}</span></span>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                  <div className="inline-flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${order.payment.depositPaid ? "bg-emerald-600" : "bg-gray-300"}`} />
                    <span>{order.payment.depositPaid ? "Đã cọc" : "Chưa cọc"}</span>
                    <span className="hidden md:inline text-gray-500">· {formatCurrencyVND(order.payment.depositAmount)}</span>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${order.payment.remainingPaid ? "bg-emerald-600" : "bg-gray-300"}`} />
                    <span>{order.payment.remainingPaid ? "Đã TT" : "Chưa TT"}</span>
                    <span className="hidden md:inline text-gray-500">· {formatCurrencyVND(order.payment.remainingAmount)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-gray-500 py-6 border border-dashed rounded-lg">
              Chưa có yêu cầu thu mua nào.
            </div>
          )}
        </div>

        <Link to="/admin/buy-requests">
          <Button variant="outline" className="w-full text-sm bg-transparent">
            Xem tất cả yêu cầu
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default DeliveryInfo

