import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Order, OrderParty } from '../../types/api'

const mockOrders: Order[] = [
  { id: 'ORD001', farm: 'Nông trại A', customer: 'Nguyễn Văn A', total: 150000, status: 'pending', createdAt: '2024-01-15T10:30:00Z', auctionId: 'AUC-001', auctionTitle: 'Phiên đấu giá nông sản tuần 45', winnerName: 'Nguyễn Văn A', payment: { depositPaid: true, depositAmount: 30000, remainingPaid: false, remainingAmount: 120000 }, farmerBank: { bankName: 'Vietcombank', accountName: 'Nguyen Van A', accountNumber: '0123456789' }, buyerBank: { bankName: 'Techcombank', accountName: 'Le Thi B', accountNumber: '9876543210' }, messages: [ { from: 'buyer', content: 'Tôi muốn xác nhận thời gian giao hàng dự kiến?', time: '2024-01-15T11:00:00Z' }, { from: 'farmer', content: 'Dự kiến ngày 18/01, tôi sẽ liên hệ shipper.', time: '2024-01-15T11:10:00Z' } ] },
  { id: 'ORD002', farm: 'Nông trại B', customer: 'Trần Thị B', total: 200000, status: 'confirmed', createdAt: '2024-01-14T14:20:00Z', auctionId: 'AUC-002', auctionTitle: 'Đấu giá đặc biệt cuối tháng', winnerName: 'Đại lý D', payment: { depositPaid: true, depositAmount: 50000, remainingPaid: true, remainingAmount: 150000 }, farmerBank: { bankName: 'ACB', accountName: 'Tran Thi B', accountNumber: '111222333' }, buyerBank: { bankName: 'VietinBank', accountName: 'Cong ty D', accountNumber: '333222111' }, messages: [ { from: 'buyer', content: 'Hàng nhận đủ, cảm ơn.', time: '2024-01-21T09:00:00Z' }, { from: 'farmer', content: 'Cảm ơn đã ủng hộ.', time: '2024-01-21T09:10:00Z' } ] },
  { id: 'ORD003', farm: 'Nông trại C', customer: 'Lê Văn C', total: 300000, status: 'delivered', createdAt: '2024-01-13T09:15:00Z', auctionId: 'AUC-003', auctionTitle: 'Phiên đấu giá số 3', winnerName: 'Nhà bán lẻ E', payment: { depositPaid: true, depositAmount: 60000, remainingPaid: true, remainingAmount: 240000 }, farmerBank: { bankName: 'MB Bank', accountName: 'Le Van C', accountNumber: '555666777' }, buyerBank: { bankName: 'BIDV', accountName: 'Nha ban le E', accountNumber: '777666555' }, messages: [ { from: 'farmer', content: 'Đơn đã giao thành công.', time: '2024-01-16T16:00:00Z' } ], complaint: { by: 'buyer', content: 'Một số trái bị dập, mong hỗ trợ.', time: '2024-01-16T17:00:00Z' } },
]

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [open, setOpen] = useState(false)
  const openDetails = (order: Order) => { setSelectedOrder(order); setOpen(true) }
  const closeDetails = () => { setOpen(false); setSelectedOrder(null) }
  const copyBankInfo = (order: Order, party: OrderParty) => {
    const info = party === 'farmer' ? order.farmerBank : order.buyerBank
    if (!info) return
    const text = `Ngân hàng: ${info.bankName}\nChủ TK: ${info.accountName}\nSố TK: ${info.accountNumber}`
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {})
    }
  }
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' })
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  const getStatusBadge = (status: string) => status === 'pending' ? (<Badge variant="outline" className="text-yellow-600 border-yellow-600">Chờ xác nhận</Badge>) : status === 'confirmed' ? (<Badge variant="outline" className="text-blue-600 border-blue-600">Đã xác nhận</Badge>) : status === 'shipping' ? (<Badge variant="outline" className="text-purple-600 border-purple-600">Đang giao</Badge>) : status === 'delivered' ? (<Badge variant="outline" className="text-green-600 border-green-600">Đã giao</Badge>) : status === 'cancelled' ? (<Badge variant="outline" className="text-red-600 border-red-600">Đã hủy</Badge>) : (<Badge variant="outline">Unknown</Badge>)

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý đơn hàng</h1>
        <p className="text-responsive-base text-gray-600">Danh sách đơn hàng của các nông trại</p>
      </div>
      <Card className="card-responsive">
        <div className="mb-4">
          <h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách đơn hàng</h2>
          <p className="text-responsive-sm text-gray-600">Có {mockOrders.length} đơn hàng trong hệ thống</p>
        </div>
        <div className="overflow-x-hidden">
          <div className="hidden md:block">
            <SimpleTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead>Nông trại</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Tổng</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Cọc</TableHead>
                  <TableHead>Còn lại</TableHead>
                  <TableHead> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell><div className="truncate max-w-[160px]" title={order.farm}>{order.farm}</div></TableCell>
                    <TableCell><div className="truncate max-w-[160px]" title={order.customer}>{order.customer}</div></TableCell>
                    <TableCell className="font-medium text-xs">{formatCurrency(order.total)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-xs">{formatDate(order.createdAt)}</TableCell>
                    <TableCell><label className="inline-flex items-center gap-2 cursor-default select-none whitespace-nowrap text-xs"><span className={`w-2.5 h-2.5 rounded-full ${order.payment.depositPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} /><span className="text-gray-700">{order.payment.depositPaid ? 'Đã cọc' : 'Chưa cọc'}</span><span className="hidden lg:inline text-gray-500">· {formatCurrency(order.payment.depositAmount)}</span></label></TableCell>
                    <TableCell><label className="inline-flex items-center gap-2 cursor-default select-none whitespace-nowrap text-xs"><span className={`w-2.5 h-2.5 rounded-full ${order.payment.remainingPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} /><span className="text-gray-700">{order.payment.remainingPaid ? 'Đã TT' : 'Chưa TT'}</span><span className="hidden lg:inline text-gray-500">· {formatCurrency(order.payment.remainingAmount)}</span></label></TableCell>
                    <TableCell className="text-right whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => openDetails(order)} className="h-7 px-2 text-xs">Xem chi tiết</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </SimpleTable>
          </div>
          <div className="md:hidden space-y-3">
            {mockOrders.map((order) => (
              <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate" title={order.id}>{order.id}</h3>
                      <p className="text-sm text-gray-500 truncate" title={order.customer}>Khách hàng: {order.customer}</p>
                    </div>
                    <div className="ml-2">{getStatusBadge(order.status)}</div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between items-center"><span className="font-medium">Nông trại:</span><span className="truncate max-w-[150px]" title={order.farm}>{order.farm}</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Tổng tiền:</span><span className="font-medium text-green-600">{formatCurrency(order.total)}</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Cọc:</span><span className="text-xs">{order.payment.depositPaid ? 'Đã cọc' : 'Chưa cọc'} · {formatCurrency(order.payment.depositAmount)}</span></div>
                    <div className="flex justify-between items-center"><span className="font-medium">Còn lại:</span><span className="text-xs">{order.payment.remainingPaid ? 'Đã TT' : 'Chưa TT'} · {formatCurrency(order.payment.remainingAmount)}</span></div>
                    <p className="text-xs text-gray-500 mt-1"><span className="font-medium">Ngày tạo:</span> {formatDate(order.createdAt)}</p>
                    <div className="pt-2 text-right"><Button size="sm" variant="outline" onClick={() => openDetails(order)}>Xem chi tiết</Button></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {open && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Chi tiết đơn hàng · {selectedOrder.id}</h3><button onClick={closeDetails} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button></div>
            <div className="p-5 space-y-5 max-h-[80vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Nông trại:</span> <span className="font-medium">{selectedOrder.farm}</span></div>
                <div><span className="text-gray-500">Khách hàng:</span> <span className="font-medium">{selectedOrder.customer}</span></div>
                <div><span className="text-gray-500">Tổng tiền:</span> <span className="font-medium text-green-600">{formatCurrency(selectedOrder.total)}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Trạng thái:</span> {getStatusBadge(selectedOrder.status)}</div>
                <div><span className="text-gray-500">Ngày tạo:</span> <span className="font-medium">{formatDate(selectedOrder.createdAt)}</span></div>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Thông tin phiên đấu giá</h4>
                {selectedOrder.auctionId ? (
                  <div className="text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><span className="text-gray-500">Mã phiên:</span> <span className="font-medium">{selectedOrder.auctionId}</span></div>
                    <div className="truncate"><span className="text-gray-500">Tiêu đề:</span> <span className="font-medium">{selectedOrder.auctionTitle}</span></div>
                    <div><span className="text-gray-500">Người thắng:</span> <span className="font-medium">{selectedOrder.winnerName}</span></div>
                  </div>
                ) : (<p className="text-sm text-gray-500">Đơn hàng không liên kết phiên đấu giá.</p>)}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Thanh toán</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.payment.depositPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} /><span className="text-gray-500">Cọc:</span><span className="font-medium">{selectedOrder.payment.depositPaid ? 'Đã cọc' : 'Chưa cọc'}</span><span className="text-gray-500">·</span><span className="font-medium">{formatCurrency(selectedOrder.payment.depositAmount)}</span></div>
                  <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${selectedOrder.payment.remainingPaid ? 'bg-emerald-600' : 'bg-gray-300'}`} /><span className="text-gray-500">Còn lại:</span><span className="font-medium">{selectedOrder.payment.remainingPaid ? 'Đã thanh toán' : 'Chưa thanh toán'}</span><span className="text-gray-500">·</span><span className="font-medium">{formatCurrency(selectedOrder.payment.remainingAmount)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Phản hồi giữa nông trại và người mua</h4>
                {selectedOrder.messages && selectedOrder.messages.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {selectedOrder.messages.map((m, idx) => (
                      <div key={idx} className="border rounded p-2 bg-gray-50"><div className="flex items-center gap-2 text-xs text-gray-500 mb-1"><span className="font-medium">{m.from === 'farmer' ? 'Nông trại' : 'Người mua'}</span><span>·</span><span>{formatDate(m.time)}</span></div><div className="text-gray-800">{m.content}</div></div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-gray-500">Chưa có phản hồi.</p>)}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Khiếu nại</h4>
                {selectedOrder.complaint ? (
                  <div className="text-sm text-gray-700 border rounded p-3 bg-orange-50"><div className="mb-1 text-xs text-gray-600">Bên khiếu nại: <span className="font-medium">{selectedOrder.complaint.by === 'farmer' ? 'Nông trại' : 'Người mua'}</span> · {formatDate(selectedOrder.complaint.time)}</div><div className="whitespace-pre-wrap">{selectedOrder.complaint.content}</div></div>
                ) : (<p className="text-sm text-gray-500">Không có khiếu nại.</p>)}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Thông tin chuyển khoản</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded p-3"><div className="font-semibold mb-2">Nông trại</div>{selectedOrder.farmerBank ? (<div className="text-sm text-gray-700 space-y-1"><div>Ngân hàng: <span className="font-medium">{selectedOrder.farmerBank.bankName}</span></div><div>Chủ TK: <span className="font-medium">{selectedOrder.farmerBank.accountName}</span></div><div>Số TK: <span className="font-medium">{selectedOrder.farmerBank.accountNumber}</span></div><Button size="sm" className="mt-2" onClick={() => copyBankInfo(selectedOrder, 'farmer')}>Sao chép thông tin</Button></div>) : (<div className="text-sm text-gray-500">Chưa có thông tin.</div>)}</div>
                  <div className="border rounded p-3"><div className="font-semibold mb-2">Người mua</div>{selectedOrder.buyerBank ? (<div className="text-sm text-gray-700 space-y-1"><div>Ngân hàng: <span className="font-medium">{selectedOrder.buyerBank.bankName}</span></div><div>Chủ TK: <span className="font-medium">{selectedOrder.buyerBank.accountName}</span></div><div>Số TK: <span className="font-medium">{selectedOrder.buyerBank.accountNumber}</span></div><Button size="sm" className="mt-2" onClick={() => copyBankInfo(selectedOrder, 'buyer')}>Sao chép thông tin</Button></div>) : (<div className="text-sm text-gray-500">Chưa có thông tin.</div>)}</div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><Button variant="outline" onClick={closeDetails}>Đóng</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}

