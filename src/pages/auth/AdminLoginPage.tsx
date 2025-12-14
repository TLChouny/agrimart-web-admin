import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent } from "../../components/ui/card"
import { FormContainer } from "../../components/forms/FormContainer"
import { FormField } from "../../components/forms/FormField"
import { adminAuthService } from "../../services/adminAuthService"
import { SUCCESS_MESSAGES, ERROR_MESSAGES, FORM_MESSAGES, getWelcomeMessage } from "../../services/constants/messages"
import type { User } from "../../types"
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Button } from '../../components/ui/button'
import { useToastContext } from "../../contexts/ToastContext"

interface AdminLoginPageProps {
  onLoginSuccess?: (user: User) => void
}

export default function AdminLoginPage({ onLoginSuccess }: AdminLoginPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToastContext()
  const { setAuth } = useAuth()

  const validateEmail = (emailValue: string): boolean => {
    if (!emailValue.trim()) {
      setEmailError(ERROR_MESSAGES.EMAIL_REQUIRED)
      return false
    }
    if (!emailValue.includes("@")) {
      setEmailError(ERROR_MESSAGES.EMAIL_MUST_CONTAIN_AT)
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue.trim())) {
      setEmailError(ERROR_MESSAGES.EMAIL_INVALID_FORMAT)
      return false
    }
    setEmailError("")
    return true
  }

  const validatePassword = (passwordValue: string): boolean => {
    if (!passwordValue) {
      setPasswordError(ERROR_MESSAGES.PASSWORD_REQUIRED)
      return false
    }
    if (passwordValue.length < 6) {
      setPasswordError(ERROR_MESSAGES.PASSWORD_MIN_LENGTH)
      return false
    }
    const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/
    if (!specialCharRegex.test(passwordValue)) {
      setPasswordError(ERROR_MESSAGES.PASSWORD_SPECIAL_CHAR)
      return false
    }
    setPasswordError("")
    return true
  }

  const handleEmailChange = (value: string) => {
    setEmail(value)
    if (emailError) {
      validateEmail(value)
    }
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    if (passwordError) {
      validatePassword(value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      // Tạo danh sách lỗi cụ thể
      const errors: string[] = []
      if (!isEmailValid && emailError) {
        errors.push(emailError)
      }
      if (!isPasswordValid && passwordError) {
        errors.push(passwordError)
      }
      
      toast({
        title: ERROR_MESSAGES.VALIDATION_ERROR_TITLE,
        description: errors.length > 0 ? errors.join('. ') : ERROR_MESSAGES.VALIDATION_ERROR_DESCRIPTION,
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await adminAuthService.login({ email: email.trim(), password })
      setAuth({ user: response.user, token: response.token })

      toast({
        title: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        description: getWelcomeMessage(response.user.name),
      })

      navigate("/admin", { replace: true })
      if (onLoginSuccess) onLoginSuccess(response.user)
    } catch (error) {
      let errorMessage: string = ERROR_MESSAGES.LOGIN_FAILED
      let errorTitle: string = ERROR_MESSAGES.LOGIN_FAILED_TITLE
      
      if (error instanceof Error) {
        const message = error.message.trim()
        
        // Kiểm tra các loại lỗi cụ thể
        if (message.includes(ERROR_MESSAGES.NOT_ADMIN) || 
            message.includes('không có quyền') || 
            message.includes(ERROR_MESSAGES.NOT_ADMIN_DETAIL)) {
          errorMessage = ERROR_MESSAGES.NOT_ADMIN_DETAIL
          errorTitle = ERROR_MESSAGES.NOT_ADMIN_TITLE
        } else if (message.includes(ERROR_MESSAGES.CANNOT_VALIDATE_ADMIN)) {
          errorMessage = ERROR_MESSAGES.CANNOT_VALIDATE_ADMIN
          errorTitle = ERROR_MESSAGES.CANNOT_VALIDATE_ADMIN_TITLE
        } else if (message.includes('401') || message.includes('Unauthorized')) {
          errorMessage = ERROR_MESSAGES.AUTH_FAILED
          errorTitle = ERROR_MESSAGES.AUTH_FAILED_TITLE
        } else if (message.includes('Network') || message.includes('fetch')) {
          errorMessage = ERROR_MESSAGES.NETWORK_ERROR
          errorTitle = ERROR_MESSAGES.CONNECTION_ERROR_TITLE
        } else if (message !== '' && message !== undefined) {
          errorMessage = message
        }
      }
      
      toast({ 
        title: errorTitle, 
        description: errorMessage, 
        variant: 'destructive' 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white p-3 sm:p-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <img 
              src="/assets/logo.png" 
              alt="AgriMart Logo" 
              className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
            />
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
                label={FORM_MESSAGES.EMAIL_LABEL}
                id="email"
                type="email"
                placeholder={FORM_MESSAGES.EMAIL_PLACEHOLDER}
                value={email}
                onChange={handleEmailChange}
                required
                error={emailError}
                description={FORM_MESSAGES.EMAIL_DESCRIPTION}
              />
              <div className="space-y-2 h-full">
                <Label htmlFor="password" className="flex items-center gap-1 text-sm sm:text-base h-6">
                  {FORM_MESSAGES.PASSWORD_LABEL}
                  <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={FORM_MESSAGES.PASSWORD_PLACEHOLDER}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    required
                    variant={passwordError ? "error" : "default"}
                    className={`text-sm sm:text-base pr-10 ${passwordError ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
                {FORM_MESSAGES.PASSWORD_DESCRIPTION && (
                  <p className="text-xs sm:text-sm text-gray-500">{FORM_MESSAGES.PASSWORD_DESCRIPTION}</p>
                )}
                {passwordError && (
                  <p className="text-xs sm:text-sm text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                    {passwordError}
                  </p>
                )}
              </div>
            </FormContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

