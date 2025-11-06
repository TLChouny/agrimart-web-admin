import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../../components/ui/card"
import { FormContainer } from "../../components/forms/FormContainer"
import { FormField } from "../../components/forms/FormField"
import { adminAuthService } from "../../services/adminAuthService"
import { useToast } from "../../hooks/use-toast"
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from "../../services/constants/messages"
import type { User } from "../../types"
import { ToastContainer } from '../../components/ui/ToastContainer'
import { useAuth } from '../../contexts/AuthContext'

interface AdminLoginPageProps {
  onLoginSuccess?: (user: User) => void
}

export default function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast, dismiss, toasts } = useToast()
  const { setAuth } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await adminAuthService.login({ email, password })
      setAuth({ user: response.user, token: response.token })

      toast({
        title: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        description: `Chào mừng ${response.user.name}!`,
      })

      navigate("/admin", { replace: true })
      if (onLoginSuccess) onLoginSuccess(response.user)
    } catch (error) {
      let errorMessage: string = ERROR_MESSAGES.LOGIN_FAILED
      if (
        error instanceof Error &&
        (error.message.includes(ERROR_MESSAGES.NOT_ADMIN) || error.message.includes('không có quyền'))
      ) {
        errorMessage = ERROR_MESSAGES.NOT_ADMIN
      } else if (error instanceof Error && error.message !== '' && error.message !== undefined) {
        errorMessage = error.message
      }
      toast({ title: 'Lỗi đăng nhập', description: errorMessage as string, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-3 sm:p-4">
        <div className="w-full max-w-sm sm:max-w-md">
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
              <div className="h-6 w-6 sm:h-8 sm:w-8 bg-green-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-base">A</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-green-800">AgriMart Admin</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Đăng nhập</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2 px-2">Nhập thông tin để truy cập trang Admin</p>
          </div>

          <Card className="border-green-200">
            <CardContent className="p-4 sm:p-6">
              <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                  <strong>Chú ý:</strong> Trang này chỉ dành cho quản trị viên. 
                  Tài khoản admin được tạo bởi hệ thống, không thể đăng ký tự do.
              </div>

              <FormContainer onSubmit={handleSubmit} submitText="Đăng nhập" isLoading={isLoading}>
                <FormField
                  label="Email quản trị"
                  id="email"
                  type="email"
                  placeholder="admin@agrimart.com"
                  value={email}
                  onChange={setEmail}
                  required
                />
                <FormField
                  label="Mật khẩu"
                  id="password"
                  type="password"
                  value={password}
                  onChange={setPassword}
                  required
                />
              </FormContainer>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}

