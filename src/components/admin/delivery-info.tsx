import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { CalendarDays, User, Leaf, DollarSign } from "lucide-react"
import { Link } from "react-router-dom"

export function DeliveryInfo() {
  const ordersSummary = [
    {
      id: 'ORD001',
      farm: 'Nông trại A',
      customer: 'Nguyễn Văn A',
      total: 150000,
      status: 'pending' as const,
      createdAt: '2024-01-15T10:30:00Z',
      payment: { depositPaid: true, depositAmount: 30000, remainingPaid: false, remainingAmount: 120000 },
    },
    {
      id: 'ORD002',
      farm: 'Nông trại B',
      customer: 'Trần Thị B',
      total: 200000,
      status: 'confirmed' as const,
      createdAt: '2024-01-14T14:20:00Z',
      payment: { depositPaid: true, depositAmount: 50000, remainingPaid: true, remainingAmount: 150000 },
    },
    {
      id: 'ORD003',
      farm: 'Nông trại C',
      customer: 'Lê Văn C',
      total: 300000,
      status: 'delivered' as const,
      createdAt: '2024-01-13T09:15:00Z',
      payment: { depositPaid: true, depositAmount: 60000, remainingPaid: true, remainingAmount: 240000 },
    },
  ]

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ xác nhận</Badge>
      case 'confirmed':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Đã xác nhận</Badge>
      case 'shipping':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Đang giao</Badge>
      case 'delivered':
        return <Badge variant="outline" className="text-green-600 border-green-600">Đã giao</Badge>
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600">Đã hủy</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <Card className="min-h-[260px]">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Thông tin đơn hàng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {ordersSummary.map((o) => (
            <div key={o.id} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="font-medium">#{o.id}</div>
                {getStatusBadge(o.status)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="truncate">Khách: <span className="font-medium">{o.customer}</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Leaf className="w-4 h-4 text-gray-400" />
                  <span className="truncate">Nông trại: <span className="font-medium">{o.farm}</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span>Tổng: <span className="font-medium text-green-600">{formatCurrency(o.total)}</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CalendarDays className="w-4 h-4 text-gray-400" />
                  <span>Ngày: <span className="font-medium">{formatDate(o.createdAt)}</span></span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-700">
                <div className="inline-flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${o.payment.depositPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                  <span>{o.payment.depositPaid ? 'Đã cọc' : 'Chưa cọc'}</span>
                  <span className="hidden md:inline text-gray-500">· {formatCurrency(o.payment.depositAmount)}</span>
                </div>
                <div className="inline-flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${o.payment.remainingPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} />
                  <span>{o.payment.remainingPaid ? 'Đã TT' : 'Chưa TT'}</span>
                  <span className="hidden md:inline text-gray-500">· {formatCurrency(o.payment.remainingAmount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link to="/admin/orders">
          <Button variant="outline" className="w-full text-sm bg-transparent">
            Xem tất cả giao hàng
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}

export default DeliveryInfo

