import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Label } from "../ui/label"
import { Mail, User, Calendar, MapPin } from "lucide-react"
import type { PendingAccount } from "../../types/approval"

interface AccountDetailModalProps {
  account: PendingAccount | null
  isOpen: boolean
  onClose: () => void
  formatDate: (dateString: string) => string
}

const AccountDetailModal: React.FC<AccountDetailModalProps> = ({ account, isOpen, onClose, formatDate }) => {
  if (!account) return null
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-gray-200">
          <DialogTitle className="text-2xl font-semibold text-gray-900">Chi tiết tài khoản: {account.fullName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><User className="h-4 w-4 text-emerald-600" /></div>
              Thông tin cá nhân
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Họ và tên</Label><p className="text-gray-900 font-medium">{account.fullName}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Email</Label><p className="text-gray-900 break-all">{account.email}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Số điện thoại</Label><p className="text-gray-900">{account.phone}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Địa chỉ</Label><p className="text-gray-900 break-words">{account.address}</p></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><MapPin className="h-4 w-4 text-emerald-600" /></div>
              Thông tin nông trại
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Tên nông trại</Label><p className="text-gray-900 font-medium">{account.farmName}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Địa chỉ nông trại</Label><p className="text-gray-900 break-words">{account.farmAddress}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Diện tích</Label><p className="text-gray-900">{account.farmSize}</p></div>
                <div><Label className="text-sm font-medium text-gray-700 mb-1 block">Loại hình</Label><p className="text-gray-900">{account.farmType}</p></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><Mail className="h-4 w-4 text-emerald-600" /></div>
              Tài liệu đính kèm
            </h3>
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3"><h4 className="font-medium text-gray-900 text-sm">Giấy chứng nhận đất đai</h4><div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-emerald-400 transition-colors"><div className="aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center mb-3"><img src="/land-certificate-document.jpg" alt="Giấy chứng nhận đất đai" className="w-full h-full object-cover rounded-lg" /></div><p className="text-xs text-gray-600 text-center">Giấy chứng nhận quyền sử dụng đất</p></div></div>
                <div className="space-y-3"><h4 className="font-medium text-gray-900 text-sm">CCCD mặt trước</h4><div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-emerald-400 transition-colors"><div className="aspect-[16/10] bg-gray-100 rounded-lg flex items-center justify-center mb-3"><img src="/vietnam-id-card-front-side.jpg" alt="CCCD mặt trước" className="w-full h-full object-cover rounded-lg" /></div><p className="text-xs text-gray-600 text-center">Căn cước công dân - Mặt trước</p></div></div>
                <div className="space-y-3"><h4 className="font-medium text-gray-900 text-sm">CCCD mặt sau</h4><div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 hover:border-emerald-400 transition-colors"><div className="aspect-[16/10] bg-gray-100 rounded-lg flex items-center justify-center mb-3"><img src="/vietnam-id-card-back-side.jpg" alt="CCCD mặt sau" className="w-full h-full object-cover rounded-lg" /></div><p className="text-xs text-gray-600 text-center">Căn cước công dân - Mặt sau</p></div></div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3"><Calendar className="h-4 w-4 text-emerald-600" /></div>
              Thông tin nộp đơn
            </h3>
            <div className="bg-gray-50 rounded-lg p-6"><p className="text-gray-900"><span className="font-medium">Ngày nộp:</span> {formatDate(account.submittedAt)}</p></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default AccountDetailModal

