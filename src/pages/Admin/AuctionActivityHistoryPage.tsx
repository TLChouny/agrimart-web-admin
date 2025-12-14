import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { AuctionHeaderCard } from '../../components/auction/auction-header-card'
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { auctionApi } from '../../services/api/auctionApi'
import { farmApi } from '../../services/api/farmApi'
import type { ApiEnglishAuction, ApiAuctionLog, AuctionLogType, ApiAuctionPauseSession, ApiAuctionExtend } from '../../types/api'
import { ROUTES } from '../../constants'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { ArrowLeft, FileText, Clock, Play, Ban, Edit, Filter, PauseCircle, PlayCircle, TrendingUp } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { AuctionActionDialog } from '../../components/auction/auction-action-dialog'
import { signalRService, type BidPlacedEvent, type BuyNowEvent } from '../../services/signalrService'
import { AUCTION_MESSAGES } from '../../services/constants/messages'

export default function AuctionActivityHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  const [auction, setAuction] = useState<ApiEnglishAuction | null>(null)
  const [farmName, setFarmName] = useState<string>('Unknown')
  const [loading, setLoading] = useState<boolean>(true)
  const [auctionLogs, setAuctionLogs] = useState<ApiAuctionLog[]>([])
  const [logsLoading, setLogsLoading] = useState<boolean>(false)
  const [logTypeFilter, setLogTypeFilter] = useState<'all' | AuctionLogType>('all')
  const [pauseSessions, setPauseSessions] = useState<ApiAuctionPauseSession[]>([])
  const [auctionExtends, setAuctionExtends] = useState<ApiAuctionExtend[]>([])
  const [priceChanged, setPriceChanged] = useState(false)
  // Track notified bids to prevent duplicate notifications
  const [, setNotifiedBids] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    actionType: 'pause' | 'resume' | null
  }>({
    isOpen: false,
    actionType: null,
  })
  const [pauseReason, setPauseReason] = useState('')
  const [pauseReasonCategory, setPauseReasonCategory] = useState<'fraud' | 'wrongInfo' | 'technical' | 'policy' | 'other' | null>(null)
  const [pauseReasonSpecific, setPauseReasonSpecific] = useState<string>('')
  const [resumeExtendMinute, setResumeExtendMinute] = useState('0')
  const { toast } = useToastContext()

  const fetchAuctionLogs = useCallback(async (auctionId: string, filterType?: AuctionLogType) => {
    try {
      setLogsLoading(true)
      let logsRes
      
      if (filterType) {
        // Filter theo type
        logsRes = await auctionApi.getAuctionLogsByType(filterType)
        if (logsRes.isSuccess && logsRes.data) {
          // Lọc chỉ lấy logs của auction này
          const filteredLogs = logsRes.data.filter(log => log.auctionPostId === auctionId)
          const sortedLogs = [...filteredLogs].sort((a, b) => 
            new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
          )
          setAuctionLogs(sortedLogs)
        }
      } else {
        // Lấy tất cả logs của auction
        logsRes = await auctionApi.getAuctionLogsByAuctionId(auctionId)
        if (logsRes.isSuccess && logsRes.data) {
          // Sắp xếp theo thời gian mới nhất trước
          const sortedLogs = [...logsRes.data].sort((a, b) => 
            new Date(b.dateTimeUpdate).getTime() - new Date(a.dateTimeUpdate).getTime()
          )
          setAuctionLogs(sortedLogs)
        }
      }
      
      if (logsRes && !logsRes.isSuccess) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: logsRes.message || 'Không thể tải lịch sử hoạt động',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử hoạt động'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLogsLoading(false)
    }
  }, [toast])

  // SignalR real-time updates - auto refresh on new bid / buy now
  useEffect(() => {
    if (!id) return

    signalRService
      .connect(id, {
        bidPlaced: (event: BidPlacedEvent) => {
          if (event.auctionId !== id) return
          
          // Update auction current price immediately for real-time header update
          setAuction(prev => {
            if (!prev) return prev
            return {
              ...prev,
              currentPrice: event.newPrice,
            }
          })
          
          // Trigger price animation
          setPriceChanged(true)
          setTimeout(() => setPriceChanged(false), 1000)
          
          // Show toast notification only once per bid
          setNotifiedBids(prev => {
            if (prev.has(event.bidId)) {
              return prev
            }
            const newSet = new Set(prev)
            newSet.add(event.bidId)
            toast({
              title: 'Có lượt đặt giá mới',
              description: `${event.userName} đã đặt giá ${event.newPrice.toLocaleString('vi-VN')} VNĐ`,
            })
            return newSet
          })
          
          // Auto refresh auction logs when new bid is placed
          fetchAuctionLogs(id, logTypeFilter === 'all' ? undefined : logTypeFilter)
        },
        buyNow: (event: BuyNowEvent) => {
          if (event.auctionId !== id) return
          // Buy now cũng là một hoạt động, cần refresh log + header giá
          fetchAuctionLogs(id, logTypeFilter === 'all' ? undefined : logTypeFilter)
          setAuction(prev => {
            if (!prev) return prev
            return {
              ...prev,
              currentPrice: event.buyNowPrice,
              status: 'Completed',
            }
          })
        },
      })
      .catch(error => {
        console.error('[AuctionActivityHistoryPage] Failed to init realtime connection:', error)
      })

    return () => {
      signalRService.disconnect().catch(console.error)
    }
  }, [id, logTypeFilter, fetchAuctionLogs])

  const fetchPauseSessions = async (auctionId: string) => {
    try {
      const res = await auctionApi.getAuctionPausesByAuctionId(auctionId)
      if (res.isSuccess && res.data) {
        setPauseSessions(res.data)
      }
    } catch (err) {
      console.error('Error fetching pause sessions:', err)
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

  // Fetch auction data và farm name
  useEffect(() => {
    if (!id) return

    const fetchAuctionData = async () => {
      try {
        setLoading(true)
        const auctionRes = await auctionApi.getEnglishAuctionById(id)
        if (auctionRes.isSuccess && auctionRes.data) {
          setAuction(auctionRes.data)
          // Fetch farm name
          if (auctionRes.data.farmerId) {
            try {
              const farmsRes = await farmApi.getFarms()
              if (farmsRes.isSuccess && farmsRes.data) {
                const farm = farmsRes.data.find((f: any) => f.userId === auctionRes.data?.farmerId)
                if (farm) {
                  setFarmName(farm.name)
                }
              }
            } catch (err) {
              console.error('Error fetching farm:', err)
            }
          }
        } else {
          toast({
            title: TOAST_TITLES.ERROR,
            description: auctionRes.message || 'Không thể tải thông tin phiên đấu giá',
            variant: 'destructive',
          })
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải thông tin phiên đấu giá'
        toast({
          title: TOAST_TITLES.ERROR,
          description: message,
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAuctionData()
  }, [id, toast])

  // Fetch pause sessions và extends
  useEffect(() => {
    if (!id) return
    fetchPauseSessions(id)
    fetchAuctionExtends(id)
  }, [id])

  // Khi filter thay đổi, fetch lại logs
  useEffect(() => {
    if (id) {
      fetchAuctionLogs(id, logTypeFilter === 'all' ? undefined : logTypeFilter)
    }
  }, [logTypeFilter, id, fetchAuctionLogs])

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
      case 'Pause':
        return <PauseCircle className="w-4 h-4" />
      case 'Resume':
        return <PlayCircle className="w-4 h-4" />
      case 'Extend':
        return <TrendingUp className="w-4 h-4" />
      case 'End':
        return <Clock className="w-4 h-4" />
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
      case 'Pause':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Tạm dừng</Badge>
      case 'Resume':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-600">Tiếp tục</Badge>
      case 'Extend':
        return <Badge variant="outline" className="text-teal-600 border-teal-600">Gia hạn</Badge>
      case 'End':
        return <Badge variant="outline" className="text-gray-600 border-gray-600">Kết thúc</Badge>
      default:
        return <Badge variant="outline" className="text-gray-600 border-gray-600">{type}</Badge>
    }
  }

  // Tìm pause session gần nhất với log time
  const findPauseSessionForLog = (log: ApiAuctionLog): ApiAuctionPauseSession | null => {
    if (log.type !== 'Pause' && log.type !== 'Resume') return null
    
    const logTime = new Date(log.dateTimeUpdate).getTime()
    const matchingSessions = pauseSessions
      .filter(session => {
        const sessionTime = new Date(session.pauseStartAt).getTime()
        return Math.abs(sessionTime - logTime) < 5 * 60 * 1000
      })
      .sort((a, b) => {
        const timeA = Math.abs(new Date(a.pauseStartAt).getTime() - logTime)
        const timeB = Math.abs(new Date(b.pauseStartAt).getTime() - logTime)
        return timeA - timeB
      })
    
    return matchingSessions[0] || null
  }

  // Tìm extend gần nhất với log time
  const findExtendForLog = (log: ApiAuctionLog): ApiAuctionExtend | null => {
    if (log.type !== 'Extend' && log.type !== 'Resume') return null
    
    const logTime = new Date(log.dateTimeUpdate).getTime()
    const matchingExtends = auctionExtends
      .filter(extend => {
        const extendTime = new Date(extend.createdAt).getTime()
        return Math.abs(extendTime - logTime) < 5 * 60 * 1000
      })
      .sort((a, b) => {
        const timeA = Math.abs(new Date(a.createdAt).getTime() - logTime)
        const timeB = Math.abs(new Date(b.createdAt).getTime() - logTime)
        return timeA - timeB
      })
    
    return matchingExtends[0] || null
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

  const totalExtendMinutes = auctionExtends.reduce((acc, extend) => acc + extend.extendDurationInMinutes, 0)

  const handleActionClick = (actionType: 'pause' | 'resume') => {
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
        return
      }
      if (pauseReasonCategory !== 'other' && !pauseReasonSpecific) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng chọn lý do tạm dừng.',
          variant: 'destructive',
        })
        return
      }
      const reason = pauseReason.trim()
      if (!reason) {
        toast({
          title: TOAST_TITLES.ERROR,
          description: 'Vui lòng nhập lý do tạm dừng.',
          variant: 'destructive',
        })
        return
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
          setDialogState({ isOpen: false, actionType: null })
          setPauseReason('')
          setPauseReasonCategory(null)
          setPauseReasonSpecific('')
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
          await fetchAuctionExtends(id)
          toast({
            title: TOAST_TITLES.SUCCESS,
            description: AUCTION_MESSAGES.RESUME_SUCCESS,
          })
          setDialogState({ isOpen: false, actionType: null })
          setResumeExtendMinute('0')
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
      } finally {
        setActionLoading(false)
      }
      return
    }
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
                      name="activity-history-pause-reason-category"
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
              
              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="mt-1"
                    name="activity-history-pause-reason-category"
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
                          name="activity-history-pause-reason-specific"
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

            {selectedCategory === 'other' && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Lý do tạm dừng<span className="text-red-500">*</span>
                </p>
                <Textarea
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
          <label className="text-sm font-medium text-gray-700" htmlFor="activity-history-resume-extend">
            Gia hạn thêm (phút)
          </label>
          <Input
            id="activity-history-resume-extend"
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

  const getActionConfig = () => {
    if (!dialogState.actionType) return null

    const configs = {
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

  const actionDialogConfig = getActionConfig()

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
          
          {/* Action Buttons */}
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
                onClick={() => handleActionClick('resume')}
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
                onClick={() => handleActionClick('pause')}
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

      {/* Main Content - Auction Logs */}
      <div className="space-y-6">
        {/* Auction Header Card */}
        <AuctionHeaderCard 
          auction={auction} 
          farmName={farmName} 
          totalExtendMinutes={totalExtendMinutes}
          priceChanged={priceChanged}
        />

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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={logTypeFilter}
                    onChange={(e) => setLogTypeFilter(e.target.value as AuctionLogType | 'all')}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Tất cả loại</option>
                    <option value="Create">Tạo mới</option>
                    <option value="Update">Cập nhật</option>
                    <option value="Delete">Xóa</option>
                    <option value="Publish">Xuất bản</option>
                    <option value="End">Kết thúc</option>
                    <option value="StatusChange">Thay đổi trạng thái</option>
                    <option value="Extend">Gia hạn</option>
                    <option value="Pause">Tạm dừng</option>
                    <option value="Resume">Tiếp tục</option>
                  </select>
                </div>
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
                                      2: 'Rejected',
                                      3: 'Approved',
                                      4: 'OnGoing',
                                      5: 'Completed',
                                      6: 'NoWinner',
                                      7: 'Cancelled',
                                      8: 'Pause',
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
                                      2: 'Rejected',
                                      3: 'Approved',
                                      4: 'OnGoing',
                                      5: 'Completed',
                                      6: 'NoWinner',
                                      7: 'Cancelled',
                                      8: 'Pause',
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
                        {log.type === 'Pause' && (() => {
                          const pauseSession = findPauseSessionForLog(log)
                          if (!pauseSession) return <p className="text-xs text-gray-600">Phiên đấu giá đã được tạm dừng</p>
                          
                          // Tính thời gian tạm dừng
                          let durationMinutes = pauseSession.pauseDurationInMinutes
                          if (durationMinutes === null && pauseSession.pauseEndAt) {
                            const startTime = new Date(pauseSession.pauseStartAt).getTime()
                            const endTime = new Date(pauseSession.pauseEndAt).getTime()
                            durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
                          }
                          
                          return (
                            <div className="bg-orange-50 p-3 rounded border border-orange-200 mt-2">
                              <p className="text-xs font-semibold text-orange-700 mb-2">Chi tiết tạm dừng:</p>
                              <div className="space-y-1 text-xs text-orange-600">
                                <p><span className="font-medium">Lý do:</span> {pauseSession.reason}</p>
                                <p><span className="font-medium">Bắt đầu:</span> {formatDateTime(pauseSession.pauseStartAt)}</p>
                                {pauseSession.pauseEndAt && (
                                  <p><span className="font-medium">Kết thúc:</span> {formatDateTime(pauseSession.pauseEndAt)}</p>
                                )}
                                {durationMinutes !== null && durationMinutes > 0 && (
                                  <p><span className="font-medium">Thời gian tạm dừng:</span> {durationMinutes} phút</p>
                                )}
                                {pauseSession.note && (
                                  <p><span className="font-medium">Ghi chú:</span> {pauseSession.note}</p>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                        {log.type === 'Resume' && (() => {
                          const pauseSession = findPauseSessionForLog(log)
                          const extend = findExtendForLog(log)
                          
                          // Tính thời gian tạm dừng cho Resume
                          let durationMinutes = pauseSession?.pauseDurationInMinutes ?? null
                          if (durationMinutes === null && pauseSession?.pauseEndAt) {
                            const startTime = new Date(pauseSession.pauseStartAt).getTime()
                            const endTime = new Date(pauseSession.pauseEndAt).getTime()
                            durationMinutes = Math.round((endTime - startTime) / (1000 * 60))
                          }
                          
                          return (
                            <div className="bg-emerald-50 p-3 rounded border border-emerald-200 mt-2">
                              <p className="text-xs font-semibold text-emerald-700 mb-2">Chi tiết tiếp tục:</p>
                              <div className="space-y-1 text-xs text-emerald-600">
                                {pauseSession && (
                                  <>
                                    <p><span className="font-medium">Bắt đầu tạm dừng:</span> {formatDateTime(pauseSession.pauseStartAt)}</p>
                                    {pauseSession.pauseEndAt && (
                                      <p><span className="font-medium">Kết thúc tạm dừng:</span> {formatDateTime(pauseSession.pauseEndAt)}</p>
                                    )}
                                    {durationMinutes !== null && durationMinutes > 0 && (
                                      <p><span className="font-medium">Thời gian tạm dừng:</span> {durationMinutes} phút</p>
                                    )}
                                    {pauseSession.note && (
                                      <p><span className="font-medium">Ghi chú:</span> {pauseSession.note}</p>
                                    )}
                                  </>
                                )}
                                {extend && extend.extendDurationInMinutes > 0 && (
                                  <p className="mt-2 pt-2 border-t border-emerald-300">
                                    <span className="font-medium">Gia hạn thêm:</span> {extend.extendDurationInMinutes} phút
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })()}
                        {log.type === 'Extend' && (() => {
                          const extend = findExtendForLog(log)
                          if (!extend) return <p className="text-xs text-gray-600">Phiên đấu giá đã được gia hạn</p>
                          return (
                            <div className="bg-teal-50 p-3 rounded border border-teal-200 mt-2">
                              <p className="text-xs font-semibold text-teal-700 mb-2">Chi tiết gia hạn:</p>
                              <div className="space-y-1 text-xs text-teal-600">
                                <p><span className="font-medium">Thời gian gia hạn:</span> {extend.extendDurationInMinutes} phút</p>
                                <p><span className="font-medium">Loại:</span> {extend.extendType}</p>
                                <p><span className="font-medium">Thời gian tạo:</span> {formatDateTime(extend.createdAt)}</p>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                      {/* <p className="text-xs text-gray-400 mt-2">
                        User ID: {log.userId.slice(0, 8)}...
                      </p> */}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Action Dialog */}
      {dialogState.actionType && actionDialogConfig && (
        <AuctionActionDialog
          isOpen={dialogState.isOpen}
          onOpenChange={(open) => {
            if (!open) {
              setDialogState({ isOpen: false, actionType: null })
              setPauseReason('')
              setPauseReasonCategory(null)
              setPauseReasonSpecific('')
              setResumeExtendMinute('0')
            }
          }}
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

