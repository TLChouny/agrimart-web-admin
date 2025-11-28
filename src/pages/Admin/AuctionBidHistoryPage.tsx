import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import { userApi } from '../../services/api/userApi'
import type { ApiEnglishAuction, ApiAuctionBid, User as ApiUser, ListResponse, ApiAuctionExtend } from '../../types/api'
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
  const [bids, setBids] = useState<ApiAuctionBid[]>([])
  const [bidsLoading, setBidsLoading] = useState<boolean>(false)
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({})
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
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

        // Lấy danh sách bids của auction
        await fetchAuctionBids(id)
        await fetchAuctionExtends(id)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const fetchAuctionBids = async (auctionId: string) => {
    try {
      setBidsLoading(true)
      const res = await auctionApi.getBidsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setBids(res.data)
        await loadUsersForBids(res.data)
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
      setBidsLoading(false)
    }
  }

  const loadUsersForBids = async (bidsData: ApiAuctionBid[]) => {
    // Nếu không có bid nào thì không cần gọi API user
    if (!bidsData.length) return

    try {
      const res = await userApi.list()
      if (!res.isSuccess || !res.data) return

      const raw = res.data as ListResponse<ApiUser> | ApiUser[]
      const usersArray: ApiUser[] = Array.isArray(raw) ? raw : raw.items ?? []

      if (!usersArray.length) return

      const map: Record<string, string> = {}
      usersArray.forEach((u) => {
        const fullName = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
        map[u.id] = fullName || u.email
      })

      setUserNameMap(map)
    } catch {
      // Silent fail: nếu lỗi thì vẫn hiển thị userId như cũ
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
                  {bidsLoading ? 'Đang tải...' : `Tổng ${bids.length} lượt đặt giá`}
                </p>
              </div>
            </div>

            {bidsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Đang tải danh sách đặt giá...</p>
              </div>
            ) : bids.length === 0 ? (
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
                      <TableHead className="text-right">Giới hạn auto bid</TableHead>
                      <TableHead className="text-center">Đang dẫn đầu</TableHead>
                      <TableHead className="text-center">Đã hủy</TableHead>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {bids.map((bid, index) => (
                      <TableRow key={`${bid.userId}-${index}`}>
                        <TableCell>{index + 1}</TableCell>
                      <TableCell className="text-sm text-gray-900">
                        {userNameMap[bid.userId] ?? bid.userId}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-700">
                          {bid.bidAmount.toLocaleString('vi-VN')} đ
                        </TableCell>
                        <TableCell className="text-center">
                          {bid.isAutoBid ? 'Có' : 'Không'}
                        </TableCell>
                        <TableCell className="text-right">
                          {bid.autoBidMaxLimit > 0
                            ? `${bid.autoBidMaxLimit.toLocaleString('vi-VN')} đ`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {bid.isWinning ? '✔' : ''}
                        </TableCell>
                        <TableCell className="text-center">
                          {bid.isCancelled ? '✔' : ''}
                        </TableCell>
                      </TableRow>
                    ))}
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

