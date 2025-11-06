export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://identity.a-379.store'

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
  },
  role: {
    list: '/api/role',
    create: '/api/role',
    update: (id: string) => `/api/role/${id}`,
    delete: (id: string) => `/api/role/${id}`,
    detail: (id: string) => `/api/role/${id}`,
  },
  roleClaim: {
    list: '/api/roleclaim',
    create: '/api/roleclaim',
    update: (id: string) => `/api/roleclaim/${id}`,
    delete: (id: string) => `/api/roleclaim/${id}`,
    detail: (id: string) => `/api/roleclaim/${id}`,
  },
  users: { list: '/users' },
  orders: { list: '/orders' },
  products: { list: '/products' },
  approval: {
    pending: '/approval/pending',
    approved: '/approval/approved',
    rejected: '/approval/rejected',
    approve: '/approval/approve',
    reject: '/approval/reject',
    detail: (id: string) => `/approval/${id}`,
  },
} as const

export * from './messages'

