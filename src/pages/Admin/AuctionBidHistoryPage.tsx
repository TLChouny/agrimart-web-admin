import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiAuctionLog } from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, FileText, Clock, Play, Ban, Edit } from 'lucide-react'

export default function AuctionBidHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [auctionLogs, setAuctionLogs] = useState<ApiAuctionLog[]>([])
  const [logsLoading, setLogsLoading] = useState<boolean>(false)
  const { toast } = useToastContext()

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      try {
        setLoading(true)

        // Lấy auction
        const auctionRes = await auctionApi.getEnglishAuctionById(id)
        if (!auctionRes.isSuccess || !auctionRes.data) return
        const auctionData = auctionRes.data
        setAuction(auctionData)

        // Lấy farm name
        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const farm = farmsRes.data.find(f => f.userId === auctionData.farmerId)
          if (farm) {
            setFarmName(farm.name)
          }
        }

        // Lấy auction logs
        await fetchAuctionLogs(id)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const fetchAuctionLogs = async (auctionId: string) => {
    try {
      setLogsLoading(true)
      const logsRes = await auctionApi.getAuctionLogsByAuctionId(auctionId)
      if (logsRes.isSuccess && logsRes.data) {
        // Sắp xếp theo thời gian mới nhất trước
        const sortedLogs = [...logsRes.data].sort((a, b) => 
          new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
        )
        setAuctionLogs(sortedLogs)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: logsRes.message || 'Không thể tải lịch sử đấu giá',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử đấu giá'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLogsLoading(false)
    }
  }

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'Create':
        return <FileText className="w-4 h-4" />
      case 'StatusChange':
        return <Edit className="w-4 h-4" />
      case 'Publish':
        return <Play className="w-4 h-4" />
      case 'Update':
        return <Edit className="w-4 h-4" />
      case 'Delete':
        return <Ban className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getLogTypeBadge = (type: string) => {
    switch (type) {
      case 'Create':
        return <Badge variant="outline" className="text-blue-600 border-blue-600">Tạo mới</Badge>
      case 'StatusChange':
        return <Badge variant="outline" className="text-purple-600 border-purple-600">Thay đổi trạng thái</Badge>
      case 'Publish':
        return <Badge variant="outline" className="text-green-600 border-green-600">Xuất bản</Badge>
      case 'Update':
        return <Badge variant="outline" className="text-amber-600 border-amber-600">Cập nhật</Badge>
      case 'Delete':
        return <Badge variant="outline" className="text-red-600 border-red-600">Xóa</Badge>
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">{type}</Badge>
    }
  }

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const getActiveTab = () => {
    if (location.pathname.includes('/bid-history')) return 'bid-history'
    if (location.pathname.includes('/winner')) return 'winner'
    if (location.pathname.includes('/reports')) return 'reports'
    return 'overview'
  }

  const handleTabChange = (value: string) => {
    if (!id) return
    if (value === 'overview') {
      navigate(`/admin/auctions/${id}`)
    } else if (value === 'bid-history') {
      navigate(`/admin/auctions/${id}/bid-history`)
    } else if (value === 'winner') {
      navigate(`/admin/auctions/${id}/winner`)
    } else if (value === 'reports') {
      navigate(`/admin/auctions/${id}/reports`)
    }
  }

  if (loading) return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    </div>
  )

  if (!auction) return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Không tìm thấy phiên đấu giá</p>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      {/* Header with Tabs */}
      <div className="mb-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <button
              onClick={() => navigate(ROUTES.ADMIN_AUCTIONS)}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-base font-semibold mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Chi Tiết Phiên Đấu Giá</h1>
          </div>
        </div>

        {/* Tab Navigation - Below Title */}
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Tổng Quan</TabsTrigger>
            <TabsTrigger value="bid-history">Lịch Sử Đấu Giá</TabsTrigger>
            <TabsTrigger value="winner">Người Thắng Đấu Giá</TabsTrigger>
            <TabsTrigger value="reports">Báo Cáo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Auction Logs */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard auction={auction} farmName={farmName} />

        {/* Auction Logs Section */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Lịch Sử Hoạt Động
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {logsLoading ? 'Đang tải...' : `Tổng ${auctionLogs.length} hoạt động`}
                </p>
              </div>
            </div>

            {logsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Đang tải lịch sử...</p>
              </div>
            ) : auctionLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Chưa có hoạt động nào</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {auctionLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      {getLogTypeIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getLogTypeBadge(log.type)}
                        <span className="text-xs text-gray-500">
                          {formatDateTime(log.dateTimeUpdate)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700 space-y-1">
                        {log.type === 'StatusChange' && log.oldEntity && log.newEntity && (
                          <div className="bg-white p-3 rounded border border-gray-200">
                            <p className="text-xs font-semibold text-gray-600 mb-1">Thay đổi trạng thái:</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Trước:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  try {
                                    const oldData = JSON.parse(log.oldEntity)
                                    const statusMap: Record<number, string> = {
                                      0: 'Draft',
                                      1: 'Pending',
                                      3: 'Approved',
                                      4: 'OnGoing',
                                      5: 'Completed',
                                    }
                                    return statusMap[oldData.status] || `Status ${oldData.status}`
                                  } catch {
                                    return 'N/A'
                                  }
                                })()}
                              </Badge>
                              <span className="text-xs text-gray-400">→</span>
                              <span className="text-xs text-gray-500">Sau:</span>
                              <Badge variant="outline" className="text-xs">
                                {(() => {
                                  try {
                                    const newData = JSON.parse(log.newEntity)
                                    const statusMap: Record<number, string> = {
                                      0: 'Draft',
                                      1: 'Pending',
                                      3: 'Approved',
                                      4: 'OnGoing',
                                      5: 'Completed',
                                    }
                                    return statusMap[newData.status] || `Status ${newData.status}`
                                  } catch {
                                    return 'N/A'
                                  }
                                })()}
                              </Badge>
                            </div>
                          </div>
                        )}
                        {log.type === 'Publish' && (
                          <p className="text-xs text-gray-600">Phiên đấu giá đã được xuất bản</p>
                        )}
                        {log.type === 'Create' && (
                          <p className="text-xs text-gray-600">Phiên đấu giá đã được tạo mới</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        User ID: {log.userId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

