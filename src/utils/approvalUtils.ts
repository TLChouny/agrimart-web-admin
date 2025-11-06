export function formatApprovalStatus(status: 'pending' | 'approved' | 'rejected') {
  switch (status) {
    case 'pending': return 'Chờ duyệt'
    case 'approved': return 'Đã duyệt'
    case 'rejected': return 'Từ chối'
  }
}

