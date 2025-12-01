import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiAuctionBidLog, ApiAuctionExtend } from '../../types/api'

type BidDetailsFromLog = {
  bidAmount?: number
  isAutoBid?: boolean
  autoBidMaxLimit?: number
  isWinning?: boolean
  isCancelled?: boolean
}
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, FileText } from 'lucide-react'
import {
  SimpleTable,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '../../components/ui/simple-table'

export default function AuctionBidHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [bidLogs, setBidLogs] = useState<ApiAuctionBidLog[]>([])
  const [bidLogsLoading, setBidLogsLoading] = useState<boolean>(false)
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
  const { toast } = useToastContext()

  const extractBidDetails = (log: ApiAuctionBidLog): BidDetailsFromLog | null => {
    const raw = log.newEntity || log.oldEntity
    if (!raw) return null

    try {
      const parsed = JSON.parse(raw)
      const bid = parsed?.Bid ?? parsed?.bid
      if (!bid) return null

      const toNumber = (value: unknown): number | undefined =>
        typeof value === 'number' ? value : undefined
      const toBoolean = (value: unknown): boolean | undefined => {
        if (typeof value === 'boolean') return value
        if (typeof value === 'number') return value === 1
        if (typeof value === 'string') return value.toLowerCase() === 'true'
        return undefined
      }

      return {
        bidAmount: toNumber(bid.BidAmount ?? bid.bidAmount),
        isAutoBid: toBoolean(bid.IsAutoBid ?? bid.isAutoBid),
        autoBidMaxLimit: toNumber(bid.AutoBidMaxLimit ?? bid.autoBidMaxLimit),
        isWinning: toBoolean(bid.IsWinning ?? bid.isWinning),
        isCancelled: toBoolean(bid.IsCancelled ?? bid.isCancelled),
      }
    } catch {
      return null
    }
  }

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

        // Lấy danh sách bid logs của auction
        await fetchAuctionBidLogs(id)
        await fetchAuctionExtends(id)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const fetchAuctionBidLogs = async (auctionId: string) => {
    try {
      setBidLogsLoading(true)
      const res = await auctionApi.getBidLogsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        const sortedLogs = [...res.data].sort(
          (a, b) => new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
        )
        setBidLogs(sortedLogs)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải lịch sử đặt giá',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử đặt giá'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setBidLogsLoading(false)
    }
  }

  const fetchAuctionExtends = async (auctionId: string) => {
    try {
      const res = await auctionApi.getAuctionExtendsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setAuctionExtends(res.data)
      }
    } catch (err) {
      console.error('Error fetching auction extends:', err)
    }
  }

  const totalExtendMinutes = auctionExtends.reduce((acc, extend) => acc + extend.extendDurationInMinutes, 0)

  const getActiveTab = () => {
    if (location.pathname.includes('/activity-history')) return 'activity-history'
    if (location.pathname.includes('/bid-history')) return 'bid-history'
    if (location.pathname.includes('/winner')) return 'winner'
    if (location.pathname.includes('/reports')) return 'reports'
    return 'overview'
  }

  const handleTabChange = (value: string) => {
    if (!id) return
    if (value === 'overview') {
      navigate(`/admin/auctions/${id}`)
    } else if (value === 'activity-history') {
      navigate(`/admin/auctions/${id}/activity-history`)
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
            <TabsTrigger value="activity-history">Lịch Sử Hoạt Động</TabsTrigger>
            <TabsTrigger value="bid-history">Lịch Sử Đấu Giá</TabsTrigger>
            <TabsTrigger value="winner">Người Thắng Đấu Giá</TabsTrigger>
            <TabsTrigger value="reports">Báo Cáo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Auction Logs */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard auction={auction} farmName={farmName} totalExtendMinutes={totalExtendMinutes} />

        {/* Auction Bids Section */}
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Lịch Sử Đặt Giá
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {bidLogsLoading ? 'Đang tải...' : `Tổng ${bidLogs.length} lượt đặt giá`}
                </p>
              </div>
            </div>

            {bidLogsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Đang tải danh sách đặt giá...</p>
              </div>
            ) : bidLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Chưa có lượt đặt giá nào cho phiên đấu giá này</p>
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <SimpleTable>
                  <TableHeader>
                    <tr>
                      <TableHead>STT</TableHead>
                      <TableHead>Thương lái</TableHead>
                      <TableHead className="text-right">Giá đặt</TableHead>
                      <TableHead className="text-center">Tự động</TableHead>
                      <TableHead className="text-right">Giới hạn tự động đặt giá</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {bidLogs.map((log, index) => {
                      const details = extractBidDetails(log)
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="text-sm text-gray-900">
                            {log.userName?.trim()}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-700">
                            {details?.bidAmount !== undefined ? `${details.bidAmount.toLocaleString('vi-VN')} đ` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {details?.isAutoBid ? 'Có' : 'Không'}
                          </TableCell>
                          <TableCell className="text-right">
                            {details && details.autoBidMaxLimit && details.autoBidMaxLimit > 0
                              ? `${details.autoBidMaxLimit.toLocaleString('vi-VN')} đ`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </SimpleTable>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

