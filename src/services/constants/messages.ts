export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Đăng nhập thành công',
  REGISTER_SUCCESS: 'Đăng ký thành công',
  LOGOUT_SUCCESS: 'Đăng xuất thành công',
  UPDATE_SUCCESS: 'Cập nhật thành công',
  DELETE_SUCCESS: 'Xóa thành công',
  CREATE_SUCCESS: 'Tạo mới thành công',
} as const

export const ERROR_MESSAGES = {
  LOGIN_FAILED: 'Email hoặc mật khẩu không đúng',
  REGISTER_FAILED: 'Đăng ký thất bại',
  NETWORK_ERROR: 'Lỗi kết nối mạng',
  UNAUTHORIZED: 'Bạn không có quyền truy cập',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  SERVER_ERROR: 'Lỗi máy chủ',
  NOT_ADMIN: 'Bạn không có quyền truy cập quản trị!',
  NOT_ADMIN_DETAIL: 'Bạn không có quyền truy cập trang quản trị – chỉ dành cho Quản trị viên!',
  CANNOT_VALIDATE_ADMIN: 'Không thể xác thực quyền truy cập tài khoản Quản trị viên!'
} as const

export const INFO_MESSAGES = {
  LOADING: 'Đang tải...',
  NO_DATA: 'Không có dữ liệu',
  SAVE_CONFIRM: 'Bạn có chắc chắn muốn lưu?',
  DELETE_CONFIRM: 'Bạn có chắc chắn muốn xóa?',
} as const

export const USER_ROLES = {
  ADMIN: 'admin',
  FARMER: 'farmer',
  WHOLESALER: 'wholesaler',
} as const

