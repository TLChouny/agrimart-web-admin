export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  UPDATE_SUCCESS: 'Cập nhật thành công',
  DELETE_SUCCESS: 'Xóa thành công',
  CREATE_SUCCESS: 'Tạo mới thành công',
  WELCOME_PREFIX: 'Chào mừng',
} as const

export const getWelcomeMessage = (name: string): string => {
  return `${SUCCESS_MESSAGES.WELCOME_PREFIX} ${name}!`
}

export const ERROR_MESSAGES = {
  LOGIN_FAILED: 'Email hoặc mật khẩu không đúng',
  LOGIN_FAILED_TITLE: 'Đăng nhập thất bại',
  REGISTER_FAILED: 'Đăng ký thất bại',
  NETWORK_ERROR: 'Lỗi kết nối mạng',
  UNAUTHORIZED: 'Bạn không có quyền truy cập',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  VALIDATION_ERROR_TITLE: 'Lỗi xác thực',
  VALIDATION_ERROR_DESCRIPTION: 'Vui lòng kiểm tra lại thông tin đăng nhập',
  SERVER_ERROR: 'Lỗi máy chủ',
  NOT_ADMIN: 'Bạn không có quyền truy cập quản trị!',
  NOT_ADMIN_DETAIL: 'Bạn không có quyền truy cập trang quản trị – chỉ dành cho Quản trị viên!',
  NOT_ADMIN_TITLE: 'Không có quyền truy cập',
  CANNOT_VALIDATE_ADMIN: 'Không thể xác thực quyền truy cập tài khoản Quản trị viên!',
  CANNOT_VALIDATE_ADMIN_TITLE: 'Lỗi xác thực',
  AUTH_FAILED: 'Email hoặc mật khẩu không đúng',
  AUTH_FAILED_TITLE: 'Xác thực thất bại',
  CONNECTION_ERROR_TITLE: 'Lỗi kết nối',
  // Email validation errors
  EMAIL_REQUIRED: 'Email không được để trống',
  EMAIL_MUST_CONTAIN_AT: 'Email phải chứa ký tự @',
  EMAIL_INVALID_FORMAT: 'Email không đúng định dạng (ví dụ: example@domain.com)',
  // Password validation errors
  PASSWORD_REQUIRED: 'Mật khẩu không được để trống',
  PASSWORD_MIN_LENGTH: 'Mật khẩu phải có ít nhất 6 ký tự',
  PASSWORD_SPECIAL_CHAR: 'Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt',
  // API error messages (English to Vietnamese mapping)
  PASSWORD_INCORRECT: 'Mật khẩu không đúng',
  USER_NOT_EXIST: 'Người dùng không tồn tại',
  EMAIL_NOT_EXIST: 'Email không tồn tại',
} as const

// Function to translate English API error messages to Vietnamese
export const translateApiError = (errorMessage: string): string => {
  if (!errorMessage) return ERROR_MESSAGES.LOGIN_FAILED
  
  const lowerMessage = errorMessage.toLowerCase().trim()
  
  // Password errors - check various formats
  if (lowerMessage.includes('password') && 
      (lowerMessage.includes('incorrect') || 
       lowerMessage.includes('not correct') || 
       lowerMessage.includes('wrong') ||
       lowerMessage.includes('invalid') ||
       lowerMessage.includes('is not correct'))) {
    return ERROR_MESSAGES.PASSWORD_INCORRECT
  }
  
  // User/Email not exist errors - check various formats
  if (lowerMessage.includes('not exist') || 
      lowerMessage.includes('does not exist') || 
      lowerMessage.includes('not found') ||
      lowerMessage.includes('doesn\'t exist')) {
    if (lowerMessage.includes('email') || lowerMessage.includes('user with')) {
      return ERROR_MESSAGES.EMAIL_NOT_EXIST
    }
    if (lowerMessage.includes('user')) {
      return ERROR_MESSAGES.USER_NOT_EXIST
    }
  }
  
  // Check for "user with ... is not exist" pattern
  if (lowerMessage.includes('user with') && lowerMessage.includes('is not exist')) {
    return ERROR_MESSAGES.EMAIL_NOT_EXIST
  }
  
  // Check for "user does not exist" or "user not found"
  if ((lowerMessage.includes('user') && (lowerMessage.includes('not exist') || lowerMessage.includes('not found'))) ||
      (lowerMessage.startsWith('user') && lowerMessage.includes('not'))) {
    return ERROR_MESSAGES.USER_NOT_EXIST
  }
  
  // Check for email-specific errors
  if (lowerMessage.includes('email') && (lowerMessage.includes('not exist') || lowerMessage.includes('not found'))) {
    return ERROR_MESSAGES.EMAIL_NOT_EXIST
  }
  
  // Return original message if no translation found
  return errorMessage
}

export const INFO_MESSAGES = {
  LOADING: 'Đang tải...',
  NO_DATA: 'Không có dữ liệu',
  SAVE_CONFIRM: 'Bạn có chắc chắn muốn lưu?',
  DELETE_CONFIRM: 'Bạn có chắc chắn muốn xóa?',
} as const

export const FORM_MESSAGES = {
  EMAIL_LABEL: 'Email quản trị',
  EMAIL_PLACEHOLDER: 'example@domain.com',
  EMAIL_DESCRIPTION: 'Email phải chứa @',
  PASSWORD_LABEL: 'Mật khẩu',
  PASSWORD_PLACEHOLDER: 'Tối thiểu 6 ký tự và 1 ký tự đặc biệt',
  PASSWORD_DESCRIPTION: 'Mật khẩu phải có ít nhất 6 ký tự và chứa ít nhất 1 ký tự đặc biệt',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  FARMER: 'farmer',
  WHOLESALER: 'wholesaler',
} as const

