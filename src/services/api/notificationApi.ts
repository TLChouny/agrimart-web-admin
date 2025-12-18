import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { AdminNotification, AdminNotificationType, AdminNotificationSeverity } from '../../types'

// Raw notification DTO từ messaging-service
interface ApiNotification {
  id: string
  userId: string
  type: number
  severity: number
  title: string
  message: string
  isRead: boolean
  readAt: string | null
  data: string | null
  relatedEntityId: string | null
  relatedEntityType: string | null
  createdAt: string
  updatedAt: string | null
}

// Map type number -> AdminNotificationType cho admin
const mapApiTypeToAdminType = (type: number, relatedEntityType?: string | null): AdminNotificationType => {
  const entity = (relatedEntityType || '').toLowerCase()

  // 15: Phiên đấu giá mới chờ duyệt
  if (type === 15 || entity.includes('auction')) {
    return 'auction_pending'
  }

  // 17: Yêu cầu rút tiền mới
  if (type === 17 || entity.includes('withdraw')) {
    return 'withdraw_pending'
  }

  // 11: Nạp tiền vào ví hệ thống
  if (type === 11 || entity.includes('wallet')) {
    return 'wallet_transfer'
  }

  // Mặc định: system / account / certification / dispute có thể được đẩy qua SignalR riêng
  return 'system'
}

// Map severity number -> AdminNotificationSeverity
const mapApiSeverityToAdminSeverity = (severity: number): AdminNotificationSeverity => {
  // Dựa trên agrimart-web: 0=Info,1=Warning,2=Critical
  if (severity === 1) return 'warning'
  if (severity === 2) return 'error'
  return 'info'
}

// Convert ApiNotification -> AdminNotification
const mapApiToAdminNotification = (n: ApiNotification): AdminNotification => {
  return {
    id: n.id,
    type: mapApiTypeToAdminType(n.type, n.relatedEntityType),
    title: n.title,
    message: n.message,
    severity: mapApiSeverityToAdminSeverity(n.severity),
    isRead: n.isRead,
    relatedEntityId: n.relatedEntityId ?? undefined,
    relatedEntityType: n.relatedEntityType ?? undefined,
    data: n.data ? { raw: n.data } : undefined,
    createdAt: n.createdAt,
    readAt: n.readAt,
  }
}

export const notificationApi = {
  async getNotifications(userId: string, pageNumber = 1, pageSize = 20): Promise<AdminNotification[]> {
    const response = await httpClient.get<ApiNotification[]>(
      ENDPOINTS.notification.byUserId(userId),
      {
        params: { pageNumber, pageSize },
        cache: false,
      }
    )

    if (!response.isSuccess || !response.data) {
      return []
    }

    return response.data.map(mapApiToAdminNotification)
  },

  async getUnreadCount(userId: string): Promise<number> {
    const response = await httpClient.get<number>(
      ENDPOINTS.notification.unreadCountByUserId(userId),
      { cache: false }
    )

    if (!response.isSuccess || typeof response.data !== 'number') {
      return 0
    }

    return response.data
  },

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const response = await httpClient.post(
      ENDPOINTS.notification.markAsRead(notificationId),
      {},
      { invalidateCache: ENDPOINTS.notification.byUserId(userId) }
    )
    return response.isSuccess
  },

  async markAllAsRead(userId: string): Promise<boolean> {
    const response = await httpClient.post(
      ENDPOINTS.notification.markAllAsRead(userId),
      {},
      { invalidateCache: ENDPOINTS.notification.byUserId(userId) }
    )
    return response.isSuccess
  },
}


