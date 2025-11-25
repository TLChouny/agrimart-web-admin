import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { AuctionLotsSection } from '../../components/auction/auction-lots-section'
import { PriceChart } from '../../components/auction/price-chart'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { Button } from '../../components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiHarvest, ApiFarm, ApiCrop, ApiHarvestGradeDetail, HarvestGradeDetailDTO, AuctionStatus } from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { AUCTION_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, CheckCircle2, XCircle, PauseCircle, Ban } from 'lucide-react'

export default function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [harvests, setHarvests] = useState<ApiHarvest[]>([])
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [farmDetail, setFarmDetail] = useState<ApiFarm | null>(null)
  const [cropsById, setCropsById] = useState<Record<string, ApiCrop>>({})
  const [currentHarvestByCropId, setCurrentHarvestByCropId] = useState<Record<string, ApiHarvest>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    actionType: 'approve' | 'reject' | 'stop' | 'cancel' | null
  }>({
    isOpen: false,
    actionType: null,
  })
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

        // Lấy harvest IDs của auction
        const harvestIdsRes = await auctionApi.getHarvestsByAuctionSessionId(auctionData.id)
        const harvestIds = harvestIdsRes.isSuccess && harvestIdsRes.data ? harvestIdsRes.data.map(h => h.harvestId) : []

        const allHarvests: ApiHarvest[] = []
        const currentHarvestMap: Record<string, ApiHarvest> = {}
        for (const hid of harvestIds) {
          const harvestRes = await farmApi.getHarvestById(hid)
          if (harvestRes.isSuccess && harvestRes.data) {
            const baseHarvest = harvestRes.data
            let gradeDetails: ApiHarvestGradeDetail[] = []
            try {
              const gradeRes = await farmApi.getHarvestGradeDetailsByHarvestId(baseHarvest.id)
              if (gradeRes.isSuccess && gradeRes.data) {
                gradeDetails = gradeRes.data
              }
            } catch (err) {
              console.error(`Lỗi lấy grade detail cho harvest ${baseHarvest.id}:`, err)
            }

            const mappedGradeDetails: HarvestGradeDetailDTO[] = gradeDetails.map(detail => ({
              id: detail.id,
              grade: detail.grade?.toString(),
              quantity: detail.quantity,
              unit: detail.unit,
            }))

            allHarvests.push({
              ...baseHarvest,
              harvestGradeDetailDTOs: mappedGradeDetails,
            })

            const currentHarvestRes = await farmApi.getCurrentHarvestByCropId(baseHarvest.cropID)
            if (currentHarvestRes.isSuccess && currentHarvestRes.data) {
              currentHarvestMap[baseHarvest.cropID] = currentHarvestRes.data
            }
          }
        }
        setHarvests(allHarvests)
        setCurrentHarvestByCropId(currentHarvestMap)

        // Lấy farm name
        const farmsRes = await farmApi.getFarms()
        if (farmsRes.isSuccess && farmsRes.data) {
          const farm = farmsRes.data.find(f => f.userId === auctionData.farmerId)
          if (farm) {
            setFarmName(farm.name)
            setFarmDetail(farm)

            const cropsRes = await farmApi.getCropsByFarmId(farm.id)
            if (cropsRes.isSuccess && cropsRes.data) {
              const cropsMap = cropsRes.data.reduce<Record<string, ApiCrop>>((acc, crop) => {
                acc[crop.id] = crop
                return acc
              }, {})
              setCropsById(cropsMap)
            }
          }
        }

      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

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

  const handleActionClick = (actionType: 'approve' | 'reject' | 'stop' | 'cancel') => {
    setDialogState({
      isOpen: true,
      actionType,
    })
  }

  const handleConfirmAction = async () => {
    if (!id || !dialogState.actionType) return

    const statusMap: Record<'approve' | 'reject' | 'stop' | 'cancel', AuctionStatus> = {
      approve: 'Approved',
      reject: 'Rejected',
      stop: 'Completed',
      cancel: 'Cancelled',
    }

    const newStatus = statusMap[dialogState.actionType]

    try {
      setActionLoading(true)
      const res = await auctionApi.updateEnglishAuctionStatus(id, newStatus)

      if (res.isSuccess) {
        // Refresh auction data
        const auctionRes = await auctionApi.getEnglishAuctionById(id)
        if (auctionRes.isSuccess && auctionRes.data) {
          setAuction(auctionRes.data)
        }

        toast({
          title: TOAST_TITLES.SUCCESS,
          description: AUCTION_MESSAGES.STATUS_UPDATE_SUCCESS || 'Cập nhật trạng thái thành công',
        })
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || AUCTION_MESSAGES.STATUS_UPDATE_ERROR || 'Không thể cập nhật trạng thái',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi cập nhật trạng thái'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(false)
      setDialogState({ isOpen: false, actionType: null })
    }
  }

  const getActionConfig = () => {
    if (!dialogState.actionType) return null

    const configs = {
      approve: {
        title: 'Xác nhận duyệt phiên đấu giá',
        description: 'Bạn có chắc chắn muốn duyệt phiên đấu giá này? Phiên sẽ được kích hoạt và có sẵn cho người dùng.',
        actionLabel: 'Duyệt',
        variant: 'approve' as const,
      },
      reject: {
        title: 'Xác nhận từ chối phiên đấu giá',
        description: 'Bạn có chắc chắn muốn từ chối phiên đấu giá này? Hành động này không thể hoàn tác.',
        actionLabel: 'Từ chối',
        variant: 'reject' as const,
      },
      stop: {
        title: 'Xác nhận dừng phiên đấu giá',
        description: 'Bạn có chắc chắn muốn dừng phiên đấu giá này? Phiên sẽ được kết thúc ngay lập tức.',
        actionLabel: 'Dừng',
        variant: 'reject' as const,
      },
      cancel: {
        title: 'Xác nhận hủy phiên đấu giá',
        description: 'Bạn có chắc chắn muốn hủy phiên đấu giá này? Hành động này không thể hoàn tác.',
        actionLabel: 'Hủy',
        variant: 'reject' as const,
      },
    }

    return configs[dialogState.actionType]
  }

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
          
          {/* Action Buttons */}
          {auction.status === 'Pending' && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleActionClick('approve')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={actionLoading}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Duyệt
              </Button>
              <Button
                onClick={() => handleActionClick('reject')}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                disabled={actionLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Không duyệt
              </Button>
            </div>
          )}

          {auction.status === 'OnGoing' && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleActionClick('stop')}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={actionLoading}
              >
                <PauseCircle className="w-4 h-4 mr-2" />
                Dừng
              </Button>
              <Button
                onClick={() => handleActionClick('cancel')}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50"
                disabled={actionLoading}
              >
                <Ban className="w-4 h-4 mr-2" />
                Hủy
              </Button>
            </div>
          )}
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

      {/* Main Content - Only show overview content */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard auction={auction} farmName={farmName} />

        {/* Price Chart */}
        <PriceChart 
          currentPrice={auction.currentPrice || auction.startingPrice}
          startingPrice={auction.startingPrice}
        />

        {/* Lots Section */}
        <AuctionLotsSection
          harvests={harvests}
          farm={farmDetail}
          cropsById={cropsById}
          currentHarvestByCropId={currentHarvestByCropId}
        />
      </div>

      {/* Action Dialog */}
      {dialogState.actionType && getActionConfig() && (
        <AuctionActionDialog
          isOpen={dialogState.isOpen}
          onOpenChange={(open) => setDialogState({ isOpen: open, actionType: dialogState.actionType })}
          onConfirm={handleConfirmAction}
          title={getActionConfig()!.title}
          description={getActionConfig()!.description}
          actionLabel={getActionConfig()!.actionLabel}
          actionVariant={getActionConfig()!.variant}
          isLoading={actionLoading}
        />
      )}
    </div>
  )
}
