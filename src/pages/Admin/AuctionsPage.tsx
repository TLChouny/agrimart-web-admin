import { useState } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { X } from 'lucide-react'
import type { Auction, AuctionStatus } from '../../types/api'

const mockAuctions: Auction[] = [
  { id: 'AUC-001', title: 'Phiên đấu giá nông sản tuần 45', farmName: 'Nông trại A', startTime: '2024-11-10T09:00:00Z', endTime: '2024-11-10T11:00:00Z', status: 'scheduled', lots: [ { id: 'LOT-1', cropName: 'Mãng cầu ta', quantity: '500', unit: 'kg', minPrice: '45,000 đ/kg' }, { id: 'LOT-2', cropName: 'Xoài cát', quantity: '300', unit: 'kg', minPrice: '38,000 đ/kg' } ], verified: false, participants: [ { id: 'P-01', name: 'Công ty A', phone: '0901 234 567', organization: 'CTY TNHH ABC', bids: [ { id: 'B-001', amount: '46,000 đ/kg', time: '2024-11-10T09:15:00Z' }, { id: 'B-004', amount: '47,500 đ/kg', time: '2024-11-10T09:40:00Z' } ] }, { id: 'P-02', name: 'Đại lý B', phone: '0902 345 678', organization: 'Đại lý B Miền Nam', bids: [ { id: 'B-002', amount: '46,500 đ/kg', time: '2024-11-10T09:25:00Z' }, { id: 'B-005', amount: '48,000 đ/kg', time: '2024-11-10T09:50:00Z' } ] }, { id: 'P-03', name: 'Cửa hàng C', phone: '0903 456 789', bids: [ { id: 'B-003', amount: '47,000 đ/kg', time: '2024-11-10T09:30:00Z' } ] } ] },
  { id: 'AUC-002', title: 'Đấu giá đặc biệt cuối tháng', farmName: 'Nông trại B', startTime: '2024-11-20T13:30:00Z', endTime: '2024-11-20T15:00:00Z', status: 'completed', lots: [ { id: 'LOT-3', cropName: 'Sầu riêng', quantity: '200', unit: 'kg', minPrice: '120,000 đ/kg' } ], winner: { participantName: 'Đại lý D', amount: '145,000 đ/kg', time: '2024-11-20T14:55:00Z' }, verified: true, participants: [ { id: 'P-10', name: 'Đại lý D', phone: '0912 111 222', organization: 'Đại lý D Group', bids: [ { id: 'B-101', amount: '135,000 đ/kg', time: '2024-11-20T13:45:00Z' }, { id: 'B-102', amount: '140,000 đ/kg', time: '2024-11-20T14:20:00Z' }, { id: 'B-103', amount: '145,000 đ/kg', time: '2024-11-20T14:55:00Z' } ] }, { id: 'P-11', name: 'Nhà bán lẻ E', phone: '0913 222 333', bids: [ { id: 'B-104', amount: '132,000 đ/kg', time: '2024-11-20T13:50:00Z' }, { id: 'B-105', amount: '138,000 đ/kg', time: '2024-11-20T14:10:00Z' } ] } ] },
]

function formatDateTime(iso: string) { return new Date(iso).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }
function getStatusBadge(status: AuctionStatus) { if (status === 'scheduled') return <Badge variant="outline" className="text-emerald-600 border-emerald-600">Đã lên lịch</Badge>; if (status === 'live') return <Badge variant="outline" className="text-blue-600 border-blue-600">Đang diễn ra</Badge>; if (status === 'completed') return <Badge variant="outline" className="text-gray-600 border-gray-600">Đã kết thúc</Badge>; return <Badge variant="outline" className="text-rose-600 border-rose-600">Đã hủy</Badge> }

export default function AuctionsPage() {
  const [selected, setSelected] = useState<Auction | null>(null)
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | AuctionStatus>('all')
  const [auctions, setAuctions] = useState<Auction[]>(mockAuctions)
  const toggleVerification = (id: string, value: boolean) => { setAuctions(prev => prev.map(a => a.id === id ? { ...a, verified: value } : a)) }
  const openDetails = (auction: Auction) => { setSelected(auction); setOpen(true) }
  const closeDetails = () => { setOpen(false); setSelected(null) }

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-responsive-2xl font-bold text-gray-900 mb-2">Quản lý phiên đấu giá</h1>
          <p className="text-responsive-base text-gray-600">Danh sách phiên đấu giá trong hệ thống</p>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Trạng thái</label>
            <select className="h-9 rounded border border-gray-300 text-sm px-2" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | AuctionStatus)}>
              <option value="all">Tất cả</option>
              <option value="scheduled">Đã lên lịch</option>
              <option value="live">Đang diễn ra</option>
              <option value="completed">Đã kết thúc</option>
              <option value="cancelled">Đã hủy</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="card-responsive">
        <div className="mb-4"><h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách phiên đấu giá</h2><p className="text-responsive-sm text-gray-600">Có {auctions.length} phiên đấu giá trong hệ thống</p></div>
        <div className="overflow-x-hidden">
          <SimpleTable>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Mã phiên</TableHead>
                <TableHead className="whitespace-nowrap">Tiêu đề</TableHead>
                <TableHead className="whitespace-nowrap">Nông trại</TableHead>
                <TableHead className="hidden md:table-cell">Bắt đầu</TableHead>
                <TableHead className="hidden md:table-cell">Kết thúc</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Xác thực</TableHead>
                <TableHead> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auctions.filter(a => statusFilter === 'all' ? true : a.status === statusFilter).map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{a.id}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[480px] truncate whitespace-nowrap">{a.title}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate whitespace-nowrap">{a.farmName}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.startTime)}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.endTime)}</TableCell>
                  <TableCell>{getStatusBadge(a.status)}</TableCell>
                  <TableCell>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
                      <input type="checkbox" className="peer sr-only" checked={!!a.verified} onChange={(e) => toggleVerification(a.id, e.target.checked)} />
                      <span className="w-10 h-6 rounded-full bg-gray-300 peer-checked:bg-emerald-600 relative transition-colors" aria-hidden="true"><span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" /></span>
                      <span className="hidden md:inline text-xs text-gray-700">{a.verified ? 'Đã xác thực' : 'Chưa xác thực'}</span>
                      <span className="md:hidden text-xs text-gray-700">{a.verified ? 'Đã' : 'Chưa'}</span>
                    </label>
                  </TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => openDetails(a)}>Xem chi tiết</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </SimpleTable>
        </div>
      </Card>

      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Chi tiết phiên · {selected.title}</h3><button onClick={closeDetails} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button></div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Mã phiên:</span> <span className="font-medium">{selected.id}</span></div>
                <div><span className="text-gray-500">Nông trại:</span> <span className="font-medium">{selected.farmName}</span></div>
                <div><span className="text-gray-500">Bắt đầu:</span> <span className="font-medium">{formatDateTime(selected.startTime)}</span></div>
                <div><span className="text-gray-500">Kết thúc:</span> <span className="font-medium">{formatDateTime(selected.endTime)}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Trạng thái:</span> {getStatusBadge(selected.status)}</div>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Người thắng phiên</h4>
                {selected.winner ? (<div className="text-sm text-gray-700"><div><span className="text-gray-500">Tên:</span> <span className="font-medium">{selected.winner.participantName}</span></div><div><span className="text-gray-500">Giá thắng:</span> <span className="font-medium">{selected.winner.amount}</span></div><div><span className="text-gray-500">Thời điểm:</span> <span className="font-medium">{formatDateTime(selected.winner.time)}</span></div></div>) : (<p className="text-sm text-gray-500">Chưa có người thắng (phiên chưa kết thúc).</p>)}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Người tham gia & Lịch sử ra giá</h4>
                {selected.participants && selected.participants.length > 0 ? (
                  <div className="space-y-3">
                    <SimpleTable>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[160px]">Tên</TableHead>
                          <TableHead className="min-w-[120px]">Số ĐT</TableHead>
                          <TableHead className="min-w-[180px]">Tổ chức</TableHead>
                          <TableHead className="min-w-[100px]">Số lần ra giá</TableHead>
                          <TableHead className="min-w-[140px]">Giá cao nhất</TableHead>
                          <TableHead className="min-w-[160px]">Lần cuối</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selected.participants.map(p => { const highest = p.bids.at(-1)?.amount || (p.bids.length ? p.bids[0].amount : '-'); const lastTime = p.bids.at(-1)?.time || '-'; return (
                          <TableRow key={p.id}><TableCell className="font-medium">{p.name}</TableCell><TableCell className="text-xs">{p.phone || '-'}</TableCell><TableCell className="text-xs">{p.organization || '-'}</TableCell><TableCell className="text-xs">{p.bids.length}</TableCell><TableCell className="text-xs">{highest}</TableCell><TableCell className="text-xs">{lastTime !== '-' ? formatDateTime(lastTime) : '-'}</TableCell></TableRow>
                        ) })}
                      </TableBody>
                    </SimpleTable>
                    {selected.participants.map(p => (
                      <div key={`bids-${p.id}`} className="text-xs text-gray-700"><div className="font-semibold mb-1">Bids · {p.name}</div>{p.bids.length ? (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">{p.bids.map(b => (<div key={b.id} className="border rounded p-2 bg-gray-50"><div><span className="text-gray-500">Mã:</span> {b.id}</div><div><span className="text-gray-500">Giá:</span> {b.amount}</div><div><span className="text-gray-500">Thời điểm:</span> {formatDateTime(b.time)}</div></div>))}</div>) : (<div className="text-gray-500">Chưa có lượt ra giá.</div>)}</div>
                    ))}
                  </div>
                ) : (<p className="text-sm text-gray-500">Chưa có người tham gia.</p>)}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Lô hàng (Lots)</h4>
                <SimpleTable>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[100px]">Mã lô</TableHead>
                      <TableHead className="min-w-[160px]">Tên nông sản</TableHead>
                      <TableHead className="min-w-[100px]">Số lượng</TableHead>
                      <TableHead className="min-w-[80px]">Đơn vị</TableHead>
                      <TableHead className="min-w-[140px]">Giá khởi điểm</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.lots.map(lot => (<TableRow key={lot.id}><TableCell className="font-mono text-xs">{lot.id}</TableCell><TableCell className="font-medium">{lot.cropName}</TableCell><TableCell className="text-xs">{lot.quantity}</TableCell><TableCell className="text-xs">{lot.unit}</TableCell><TableCell className="text-xs">{lot.minPrice}</TableCell></TableRow>))}
                  </TableBody>
                </SimpleTable>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><Button variant="outline" onClick={closeDetails}>Đóng</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}

