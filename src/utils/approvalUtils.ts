export const formatApprovalDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

export const getApprovalStatusConfig = (status: string) => {
  switch (status) {
    case 'pending': return { text: 'Chờ duyệt', className: 'text-yellow-600 border-yellow-600' }
    case 'approved': return { text: 'Đã duyệt', className: 'text-green-600 border-green-600' }
    case 'rejected': return { text: 'Đã từ chối', className: 'text-red-600 border-red-600' }
    default: return { text: 'Unknown', className: '' }
  }
}

export const mockPendingAccounts = [
  { id: '1', email: 'farmer1@example.com', fullName: 'Nguyễn Văn A', phone: '0123456789', address: '123 Đường ABC, Quận 1, TP.HCM', farmName: 'Nông trại A', farmAddress: '456 Đường XYZ, Huyện B, TP.HCM', farmSize: '2.5 ha', farmType: 'Rau củ quả', submittedAt: '2024-01-15T10:30:00Z', status: 'pending' as const, documents: ['CMND mặt trước', 'CMND mặt sau', 'Giấy chứng nhận đất'] },
  { id: '2', email: 'farmer2@example.com', fullName: 'Trần Thị B', phone: '0987654321', address: '789 Đường DEF, Quận 2, TP.HCM', farmName: 'Nông trại B', farmAddress: '101 Đường GHI, Huyện C, TP.HCM', farmSize: '1.8 ha', farmType: 'Cây ăn quả', submittedAt: '2024-01-14T14:20:00Z', status: 'pending' as const, documents: ['CMND mặt trước', 'CMND mặt sau', 'Giấy chứng nhận đất', 'Hợp đồng thuê đất'] },
  { id: '3', email: 'farmer3@example.com', fullName: 'Lê Văn C', phone: '0369258147', address: '321 Đường JKL, Quận 3, TP.HCM', farmName: 'Nông trại C', farmAddress: '654 Đường MNO, Huyện D, TP.HCM', farmSize: '3.2 ha', farmType: 'Lúa gạo', submittedAt: '2024-01-13T09:15:00Z', status: 'pending' as const, documents: ['CMND mặt trước', 'CMND mặt sau', 'Giấy chứng nhận đất', 'Bản đồ đất'] },
]
export function formatApprovalStatus(status: 'pending' | 'approved' | 'rejected') {
  switch (status) {
    case 'pending': return 'Chờ duyệt'
    case 'approved': return 'Đã duyệt'
    case 'rejected': return 'Từ chối'
  }
}

