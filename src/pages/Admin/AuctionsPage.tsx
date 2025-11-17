import { useState, useEffect } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { X } from 'lucide-react'
import { auctionApi } from '../../services/api/auctionApi' 
import { farmApi } from '../../services/api/farmApi' 
import type { ApiEnglishAuction, AuctionStatus, ApiCrop, ApiHarvest, APIResponse, PaginatedEnglishAuctions } from '../../types/api'

interface ExtendedAuction extends ApiEnglishAuction {
  farmName: string
  farmId?: string
  uiStatus: AuctionStatus
  verified: boolean
}

function formatDateTime(iso: string) { return new Date(iso).toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }

function getStatusBadge(status: AuctionStatus) { 
  switch (status) {
    case 'Draft': return <Badge variant="outline" className="text-gray-600 border-gray-600">Bản nháp</Badge>;
    case 'Pending': return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Đợi xét duyệt</Badge>;
    case 'Rejected': return <Badge variant="outline" className="text-red-600 border-red-600">Bị từ chối</Badge>;
    case 'Approved': return <Badge variant="outline" className="text-green-600 border-green-600">Chấp nhận</Badge>;
    case 'OnGoing': return <Badge variant="outline" className="text-blue-600 border-blue-600">Đang diễn ra</Badge>;
    case 'Completed': return <Badge variant="outline" className="text-gray-600 border-gray-600">Hoàn thành</Badge>;
    case 'NoWinner': return <Badge variant="outline" className="text-orange-600 border-orange-600">Không người chiến thắng</Badge>;
    case 'Cancelled': return <Badge variant="outline" className="text-rose-600 border-rose-600">Hủy</Badge>;
    default: return <Badge variant="outline" className="text-gray-600 border-gray-600">Không xác định</Badge>;
  }
}

export default function AuctionsPage() {
  const [selected, setSelected] = useState<ExtendedAuction | null>(null)
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | AuctionStatus>('all')
  const [auctions, setAuctions] = useState<ExtendedAuction[]>([])
  const [selectedCrop, setSelectedCrop] = useState<ApiCrop | null>(null)
  const [selectedHarvest, setSelectedHarvest] = useState<ApiHarvest | null>(null)
  const toggleVerification = (id: string, value: boolean) => { setAuctions(prev => prev.map(a => a.id === id ? { ...a, verified: value } : a)) }
  const openDetails = (auction: ExtendedAuction) => { setSelected(auction); setOpen(true) }
  const closeDetails = () => { setOpen(false); setSelected(null); setSelectedCrop(null); setSelectedHarvest(null) }
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      const auctionRes = await auctionApi.getEnglishAuctions(statusFilter !== 'all' ? statusFilter : undefined, pageNumber, pageSize) as APIResponse<PaginatedEnglishAuctions>
      const farmRes = await farmApi.getFarms()
  
      if (auctionRes.isSuccess && farmRes.isSuccess && auctionRes.data && farmRes.data) {
        const farmsData = farmRes.data
  
        const mappedAuctions: ExtendedAuction[] = auctionRes.data.items.map(a => {
          const farm = farmsData.find(f => f.userId === a.farmerId)
          return {
            ...a,
            farmName: farm ? farm.name : 'Unknown',
            farmId: farm ? farm.id : undefined,
            uiStatus: a.status as AuctionStatus,
            verified: false,
          }
        })
  
        setAuctions(mappedAuctions)
  
        // Lấy trực tiếp từ response BE
        setTotalPages(auctionRes.data.totalPages)
        setTotalCount(auctionRes.data.totalCount)
      }
    }
  
    fetchData()
  }, [pageNumber, pageSize, statusFilter])
   

  useEffect(() => {
    const fetchDetails = async () => {
      if (selected && selected.farmId) {
        const cropsRes = await farmApi.getCropsByFarmId(selected.farmId)
        if (cropsRes.isSuccess && cropsRes.data && cropsRes.data.length > 0) {
          const crop = cropsRes.data[0] // Assuming the first crop for simplicity; adjust if multiple
          setSelectedCrop(crop)
          const harvestRes = await farmApi.getCurrentHarvestByCropId(crop.id)
          if (harvestRes.isSuccess && harvestRes.data) {
            setSelectedHarvest(harvestRes.data)
          }
        }
      }
    }
    fetchDetails()
  }, [selected])

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
              <option value="Draft">Bản nháp</option>
              <option value="Pending">Đợi xét duyệt</option>
              <option value="Rejected">Bị từ chối</option>
              <option value="Approved">Chấp nhận</option>
              <option value="OnGoing">Đang diễn ra</option>
              <option value="Completed">Hoàn thành</option>
              <option value="NoWinner">Không người chiến thắng</option>
              <option value="Cancelled">Hủy</option>
            </select>
          </div>
        </div>
      </div>

      <Card className="card-responsive">
        <div className="mb-4"><h2 className="text-responsive-xl font-semibold text-gray-900 mb-2">Danh sách phiên đấu giá</h2><p className="text-responsive-sm text-gray-600">Có {totalCount} phiên đấu giá trong hệ thống</p></div>
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
              {auctions.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{a.sessionCode}</TableCell>
                  <TableCell className="font-medium text-xs md:text-sm max-w-[480px] truncate whitespace-nowrap">{a.note}</TableCell>
                  <TableCell className="text-xs max-w-[280px] truncate whitespace-nowrap">{a.farmName}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.publishDate)}</TableCell>
                  <TableCell className="text-xs hidden md:table-cell">{formatDateTime(a.endDate)}</TableCell>
                  <TableCell>{getStatusBadge(a.uiStatus)}</TableCell>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-gray-600">
                Trang {pageNumber}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                  disabled={pageNumber <= 1}
                >
                  Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPageNumber(p => Math.min(totalPages, p + 1))}
                  disabled={pageNumber >= totalPages}
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {open && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetails} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4">
            <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold text-gray-900">Chi tiết phiên · {selected.note}</h3><button onClick={closeDetails} className="p-1 rounded hover:bg-gray-100"><X className="w-5 h-5 text-gray-600" /></button></div>
            <div className="p-5 space-y-5 max-h-[85vh] overflow-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Mã phiên:</span> <span className="font-medium">{selected.sessionCode}</span></div>
                <div><span className="text-gray-500">Nông trại:</span> <span className="font-medium">{selected.farmName}</span></div>
                <div><span className="text-gray-500">Bắt đầu:</span> <span className="font-medium">{formatDateTime(selected.publishDate)}</span></div>
                <div><span className="text-gray-500">Kết thúc:</span> <span className="font-medium">{formatDateTime(selected.endDate)}</span></div>
                <div className="flex items-center gap-2"><span className="text-gray-500">Trạng thái:</span> {getStatusBadge(selected.uiStatus)}</div>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Người thắng phiên</h4>
                {selected.winningPrice && selected.winnerId ? (<div className="text-sm text-gray-700"><div><span className="text-gray-500">Tên:</span> <span className="font-medium">User {selected.winnerId}</span></div><div><span className="text-gray-500">Giá thắng:</span> <span className="font-medium">{selected.winningPrice} đ/kg</span></div><div><span className="text-gray-500">Thời điểm:</span> <span className="font-medium">{formatDateTime(selected.updatedAt)}</span></div></div>) : (<p className="text-sm text-gray-500">Chưa có người thắng (phiên chưa kết thúc).</p>)}
                {selected.uiStatus === 'NoWinner' && <p className="text-sm text-orange-600 mt-2">Phiên kết thúc mà không có người chiến thắng.</p>}
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Người tham gia & Lịch sử ra giá</h4>
                <p className="text-sm text-gray-500">Chưa có dữ liệu người tham gia.</p>
              </div>
              <div>
                <h4 className="text-base font-semibold text-gray-900 mb-2">Lô hàng (Lots)</h4>
                {selectedCrop && selectedHarvest ? (
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
                      {selectedHarvest.harvestGradeDetailDTOs.map((detail) => (
                        <TableRow>
                          <TableCell className="font-mono text-xs">LOT-{selected.id.slice(0,8)}</TableCell>
                          <TableCell className="font-medium">{selectedCrop.custardAppleType}</TableCell>
                          <TableCell className="text-xs">{detail.quantity}</TableCell>
                          <TableCell className="text-xs">{selectedHarvest.unit}</TableCell>
                          <TableCell className="text-xs">{selected.startingPrice} đ/kg</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </SimpleTable>
                ) : (
                  <p className="text-sm text-gray-500">Đang tải thông tin crop và harvest...</p>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end"><Button variant="outline" onClick={closeDetails}>Đóng</Button></div>
          </div>
        </div>
      )}
    </div>
  )
}