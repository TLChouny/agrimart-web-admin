import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { AuctionLotsSection } from '../../components/auction/auction-lots-section'
import { PriceChart } from '../../components/auction/price-chart'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type {
  ApiEnglishAuction,
  ApiHarvest,
  ApiFarm,
  ApiCrop,
  ApiHarvestGradeDetail,
  HarvestGradeDetailDTO,
  AuctionStatus,
  ApiAuctionExtend,
} from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { AUCTION_MESSAGES, TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, CheckCircle2, XCircle, PauseCircle, Ban, PlayCircle } from 'lucide-react'

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
    actionType: 'approve' | 'reject' | 'stop' | 'cancel' | 'pause' | 'resume' | null
  }>({
    isOpen: false,
    actionType: null,
  })
  const [pauseReason, setPauseReason] = useState('')
  const [pauseReasonCategory, setPauseReasonCategory] = useState<'fraud' | 'wrongInfo' | 'technical' | 'policy' | 'other' | null>(null)
  const [pauseReasonSpecific, setPauseReasonSpecific] = useState<string>('')
  const [resumeExtendMinute, setResumeExtendMinute] = useState('0')
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
  const [priceChartData, setPriceChartData] = useState<{ time: string; price: number }[]>([])
  const { toast } = useToastContext()

  // Fetch auction extends for this specific auction
  const fetchAuctionExtends = useCallback(async (auctionId: string) => {
    try {
      const res = await auctionApi.getAuctionExtendsByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setAuctionExtends(res.data)
      }
    } catch (err) {
      console.error('Error fetching auction extends:', err)
    }
  }, [])

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

        // Fetch auction extends for this auction
        await fetchAuctionExtends(auctionData.id)

        // Fetch bid logs for this auction (dùng cho biểu đồ giá)
        const bidLogsRes = await auctionApi.getBidLogsByAuctionId(auctionData.id)
        if (bidLogsRes.isSuccess && bidLogsRes.data) {
          const logs = bidLogsRes.data

          // Sắp xếp theo thời gian tăng dần
          const sortedLogs = [...logs].sort(
            (a, b) =>
              new Date(a.dateTimeUpdate).getTime() - new Date(b.dateTimeUpdate).getTime()
          )

          const mappedChartData = sortedLogs
            .map(log => {
              let price = 0

              // Giá bid được lưu trong newEntity (JSON string), cố gắng parse linh hoạt
              if (log.newEntity) {
                try {
                  const parsed = JSON.parse(log.newEntity as string) as any
                  price =
                    parsed.price ??
                    parsed.bidAmount ??
                    parsed.amount ??
                    parsed.currentPrice ??
                    0
                } catch {
                  // ignore parse error, fallback bên dưới
                }
              }

              if (!price || Number.isNaN(price)) {
                return null
              }

              const timeLabel = new Date(log.dateTimeUpdate).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })

              return {
                time: timeLabel,
                price,
              }
            })
            .filter(
              (item): item is { time: string; price: number } => item !== null
            )

          setPriceChartData(mappedChartData)
        }

      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // Calculate total extend minutes for this auction
  const getTotalExtendMinutes = useCallback((): number => {
    if (!id) return 0
    return auctionExtends
      .filter(extend => extend.auctionId === id)
      .reduce((total, extend) => total + extend.extendDurationInMinutes, 0)
  }, [auctionExtends, id])

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

  const handleActionClick = (actionType: 'approve' | 'reject' | 'stop' | 'cancel' | 'pause' | 'resume') => {
    if (actionType === 'pause') {
      setPauseReason('')
      setPauseReasonCategory(null)
      setPauseReasonSpecific('')
    }
    if (actionType === 'resume') {
      setResumeExtendMinute('0')
    }
    setDialogState({
      isOpen: true,
      actionType,
    })
  }

  const handleConfirmAction = async () => {
    if (!id || !dialogState.actionType) return

    if (dialogState.actionType === 'pause') {
      if (!pauseReasonCategory) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng chọn loại báo cáo.',
          variant: 'destructive',
        })
        throw new Error('PAUSE_REASON_CATEGORY_REQUIRED')
      }
      if (pauseReasonCategory !== 'other' && !pauseReasonSpecific) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng chọn lý do tạm dừng.',
          variant: 'destructive',
        })
        throw new Error('PAUSE_REASON_SPECIFIC_REQUIRED')
      }
      const reason = pauseReason.trim()
      if (!reason) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng nhập lý do tạm dừng.',
          variant: 'destructive',
        })
        throw new Error('PAUSE_REASON_REQUIRED')
      }
      try {
        setActionLoading(true)
        const res = await auctionApi.pauseEnglishAuction({ auctionId: id, reason })
        if (res.isSuccess) {
          const auctionRes = await auctionApi.getEnglishAuctionById(id)
          if (auctionRes.isSuccess && auctionRes.data) {
            setAuction(auctionRes.data)
          }
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: AUCTION_MESSAGES.PAUSE_SUCCESS,
          })
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || AUCTION_MESSAGES.PAUSE_ERROR,
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : AUCTION_MESSAGES.PAUSE_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
        throw err
      } finally {
        setActionLoading(false)
      }
      return
    }

    if (dialogState.actionType === 'resume') {
      const extendMinute = Math.max(0, Number(resumeExtendMinute) || 0)
      try {
        setActionLoading(true)
        const res = await auctionApi.resumeEnglishAuction({ auctionId: id, extendMinute })
        if (res.isSuccess) {
          const auctionRes = await auctionApi.getEnglishAuctionById(id)
          if (auctionRes.isSuccess && auctionRes.data) {
            setAuction(auctionRes.data)
          }
          // Refresh auction extends after resume
          if (id) {
            await fetchAuctionExtends(id)
          }
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: AUCTION_MESSAGES.RESUME_SUCCESS,
          })
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: res.message || AUCTION_MESSAGES.RESUME_ERROR,
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : AUCTION_MESSAGES.RESUME_ERROR
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
        throw err
      } finally {
        setActionLoading(false)
      }
      return
    }

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
      throw err
    } finally {
      setActionLoading(false)
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
      pause: {
        title: 'Tạm dừng phiên đấu giá',
        description: 'Nhập lý do tạm dừng, phiên sẽ bị khóa với người tham gia.',
        actionLabel: 'Tạm dừng',
        variant: 'pending' as const,
      },
      resume: {
        title: 'Tiếp tục phiên đấu giá',
        description: 'Thiết lập thời gian gia hạn (nếu cần) rồi mở lại phiên.',
        actionLabel: 'Tiếp tục',
        variant: 'approve' as const,
      },
    }

    return configs[dialogState.actionType]
  }

  const pauseReasonOptions = {
    fraud: {
      title: 'Gian lận',
      reasons: [
        'Sử dụng tài khoản giả mạo',
        'Lợi dụng lỗi hệ thống để trục lợi',
        'Gửi nội dung lặp hoặc spam',
        'Mạo danh người khác',
        'Thao túng đánh giá / bình chọn',
        'Các hành vi gian lận khác',
      ],
    },
    wrongInfo: {
      title: 'Thông tin sai lệch',
      reasons: [
        'Cung cấp thông tin không chính xác',
        'Thông tin cũ, lỗi thời',
        'Sai địa chỉ, số điện thoại, email',
        'Tin giả / tin không kiểm chứng',
        'Các trường hợp thông tin gây hiểu lầm khác',
      ],
    },
    technical: {
      title: 'Vấn đề kỹ thuật',
      reasons: [
        'Lỗi hiển thị / giao diện',
        'Lỗi chức năng (không click được, không gửi được)',
        'Trang tải chậm / crash',
        'Lỗi khi upload file / ảnh',
        'Lỗi liên quan đến đăng nhập / đăng ký',
        'Các lỗi kỹ thuật khác',
      ],
    },
    policy: {
      title: 'Vi phạm chính sách',
      reasons: [
        'Nội dung phản cảm / nhạy cảm',
        'Quấy rối, đe dọa người khác',
        'Spam / quảng cáo không đúng quy định',
        'Vi phạm bản quyền / thương hiệu',
        'Các hành vi trái pháp luật hoặc chính sách khác',
      ],
    },
  }

  const dialogFields = (() => {
    if (dialogState.actionType === 'pause') {
      const selectedCategory = pauseReasonCategory
      const selectedReasons = selectedCategory && selectedCategory !== 'other' ? pauseReasonOptions[selectedCategory].reasons : []

      return (
        <div className="space-y-4 text-left">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Loại báo cáo<span className="text-red-500">*</span>
            </p>
            <div className="space-y-2 mb-4">
              {Object.entries(pauseReasonOptions).map(([key, option], index) => (
                <div key={key} className="border border-gray-200 rounded-lg p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      className="mt-1"
                      name="detail-pause-reason-category"
                      value={key}
                      checked={pauseReasonCategory === key}
                      onChange={() => {
                        setPauseReasonCategory(key as typeof pauseReasonCategory)
                        setPauseReasonSpecific('')
                        setPauseReason('')
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {index + 1}. {option.title}
                      </p>
                    </div>
                  </label>
                </div>
              ))}
              
              {/* 5. Khác */}
              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="mt-1"
                    name="detail-pause-reason-category"
                    value="other"
                    checked={pauseReasonCategory === 'other'}
                    onChange={() => {
                      setPauseReasonCategory('other')
                      setPauseReasonSpecific('')
                      setPauseReason('')
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">5. Khác</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Hiển thị các lý do cụ thể khi đã chọn category */}
            {selectedCategory && selectedCategory !== 'other' && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
            Lý do tạm dừng<span className="text-red-500">*</span>
                </p>
                <div className="space-y-2">
                  {selectedReasons.map((reason, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          className="mt-1"
                          name="detail-pause-reason-specific"
                          value={reason}
                          checked={pauseReasonSpecific === reason}
                          onChange={() => {
                            setPauseReasonSpecific(reason)
                            const categoryTitle = pauseReasonOptions[selectedCategory].title
                            setPauseReason(`${categoryTitle}: ${reason}`)
                          }}
                        />
                        <div>
                          <p className="text-sm text-gray-800">{reason}</p>
                        </div>
          </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hiển thị textarea khi chọn "Khác" */}
            {selectedCategory === 'other' && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Lý do tạm dừng<span className="text-red-500">*</span>
                </p>
          <Textarea
            id="detail-pause-reason"
            rows={3}
            value={pauseReason}
            onChange={(e) => setPauseReason(e.target.value)}
            placeholder="Nhập lý do tạm dừng phiên đấu giá..."
          />
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500">Lý do sẽ xuất hiện trong lịch sử hoạt động.</p>
        </div>
      )
    }
    if (dialogState.actionType === 'resume') {
      return (
        <div className="space-y-2 text-left">
          <label className="text-sm font-medium text-gray-700" htmlFor="detail-resume-extend">
            Gia hạn thêm (phút)
          </label>
          <Input
            id="detail-resume-extend"
            type="number"
            min={0}
            value={resumeExtendMinute}
            onChange={(e) => setResumeExtendMinute(e.target.value)}
          />
          <p className="text-xs text-gray-500">Nhập 0 nếu không cần gia hạn.</p>
        </div>
      )
    }
    return null
  })()

  const actionDialogConfig = getActionConfig()

  const handleDialogOpenChange = (open: boolean) => {
    if (open) {
      setDialogState(prev => ({ ...prev, isOpen: open }))
      return
    }
    setDialogState({ isOpen: false, actionType: null })
    setPauseReason('')
    setPauseReasonCategory(null)
    setPauseReasonSpecific('')
    setResumeExtendMinute('0')
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
                onClick={() => handleActionClick('pause')}
                className="bg-amber-500 hover:bg-amber-600 text-white"
                disabled={actionLoading}
              >
                <PauseCircle className="w-4 h-4 mr-2" />
                Tạm dừng
              </Button>
              <Button
                onClick={() => handleActionClick('cancel')}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600"
                disabled={actionLoading}
              >
                <Ban className="w-4 h-4 mr-2" />
                Hủy
              </Button>
            </div>
          )}

          {auction.status === 'Pause' && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleActionClick('resume')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={actionLoading}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Tiếp tục
              </Button>
              <Button
                onClick={() => handleActionClick('cancel')}
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-50 hover:text-red-600"
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
            <TabsTrigger value="activity-history">Lịch Sử Hoạt Động</TabsTrigger>
            <TabsTrigger value="bid-history">Lịch Sử Đấu Giá</TabsTrigger>
            <TabsTrigger value="winner">Người Thắng Đấu Giá</TabsTrigger>
            <TabsTrigger value="reports">Báo Cáo</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content - Only show overview content */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard 
          auction={auction} 
          farmName={farmName}
          totalExtendMinutes={getTotalExtendMinutes()}
        />

        {/* Price Chart */}
        <PriceChart
          data={priceChartData}
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
      {dialogState.actionType && actionDialogConfig && (
        <AuctionActionDialog
          isOpen={dialogState.isOpen}
          onOpenChange={handleDialogOpenChange}
          onConfirm={handleConfirmAction}
          title={actionDialogConfig.title}
          description={actionDialogConfig.description}
          actionLabel={actionDialogConfig.actionLabel}
          actionVariant={actionDialogConfig.variant}
          isLoading={actionLoading}
        >
          {dialogFields}
        </AuctionActionDialog>
      )}
    </div>
  )
}
