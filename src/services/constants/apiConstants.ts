export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://gateway.a-379.store'

export const ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    refresh: '/api/auth/refresh',
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
  users: {
    list: '/api/users',
    detail: (id: string) => `/api/users/${id}`,
    // lock: (id: string) => `/api/users/${id}/lock`,
    // unlock: (id: string) => `/api/users/${id}/unlock`,
    updateStatus: (id: string) => `/api/users/${id}/status`,
  },
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
  farm: {
    list: '/api/farm-service/farm',
    delete: (id: string) => `/api/farm-service/farm/${encodeURIComponent(id)}`,
    cropByFarm: (id: string) => `/api/farm-service/farm/${encodeURIComponent(id)}/crop`,
    custardAppleType: {
      list: '/api/farm-service/custardappletype',
      create: '/api/farm-service/custardappletype',
      detail: (id: string) => `/api/farm-service/custardappletype/${encodeURIComponent(id)}`,
      update: (id: string) => `/api/farm-service/custardappletype/${encodeURIComponent(id)}`,
      delete: (id: string) => `/api/farm-service/custardappletype/${encodeURIComponent(id)}`,
    },
    harvest: {
      list: '/api/farm-service/harvest',
      detail: (id: string) => `/api/farm-service/harvest/${encodeURIComponent(id)}`,
      byCrop: (cropId: string) => `/api/farm-service/crop/${encodeURIComponent(cropId)}/harvest`,
      currentByCrop: (cropId: string) => `/api/farm-service/crop/${encodeURIComponent(cropId)}/currentharvest`,
      images: (harvestId: string) => `/api/farm-service/harvestimage/harvest/${encodeURIComponent(harvestId)}/images`,
      gradeDetail: {
        list: '/api/farm-service/harvestgradedetail',
        detail: (id: string) => `/api/farm-service/harvestgradedetail/${encodeURIComponent(id)}`,
        byHarvest: (harvestId: string) => `/api/farm-service/harvest/${encodeURIComponent(harvestId)}/gradedetail`,
      },
    },
  },
  auction: {
    englishAuction: {
      list: '/api/auction-service/englishauction',
      detail: (id: string) => `/api/auction-service/englishauction/${id}`, // get by id
      harvestsBySession: (auctionSessionId: string) =>
        `/api/auction-service/auctionsession/${auctionSessionId}/harvest`,
      pause: '/api/auction-service/englishauction/pause',
      resume: '/api/auction-service/englishauction/resume',
    },
    bid: {
      byAuction: (auctionId: string) =>
        `/api/auction-service/bid/auction/${encodeURIComponent(auctionId)}`,
    },
    bidLog: {
      byAuction: (auctionId: string) =>
        `/api/auction-service/bidlog/auction/${encodeURIComponent(auctionId)}`,
    },
    auctionLog: {
      byAuction: (auctionId: string) => `/api/auction-service/auctionlog/auction/${auctionId}`,
      byType: (logType: string) => `/api/auction-service/auctionlog/type/${logType}`,
    },
    auctionExtend: {
      list: '/api/auction-service/auctionextend',
      byAuction: (auctionId: string) => `/api/auction-service/auctionextend/auction/${encodeURIComponent(auctionId)}`,
    },
    auctionPause: {
      byAuction: (auctionId: string) => `/api/auction-service/auctionpause/auction/${encodeURIComponent(auctionId)}`,
    },
  },
  report: {
    list: '/api/auction-service/report',
    detail: (id: string) => `/api/auction-service/report/${encodeURIComponent(id)}`,
    byAuction: (auctionId: string) => `/api/auction-service/report/auction/${auctionId}`,
  },
  post: {
    list: '/api/post-service/post',
    detail: (id: string) => `/api/post-service/post/${encodeURIComponent(id)}`,
    updateStatus: (id: string) => `/api/post-service/post/${encodeURIComponent(id)}/status`,
  },
  wallet: {
    list: '/api/payment-service/wallet',
    system: '/api/payment-service/wallet/system',
    detail: (id: string) => `/api/payment-service/wallet/${id}`,
    byUser: (userId: string) => `/api/payment-service/wallet/user/${userId}`,
  },
  ledger: {
    list: '/api/payment-service/ledger',
    byWallet: (walletId: string) => `/api/payment-service/ledger/wallet/${walletId}`,
    byTransaction: (transactionId: string) => `/api/payment-service/ledger/transaction/${transactionId}`,
    create: '/api/payment-service/ledger',
  },
  transaction: {
    list: '/api/payment-service/transaction',
    detail: (id: string) => `/api/payment-service/transaction/${id}`,
    byWallet: (walletId: string) => `/api/payment-service/transaction/wallet/${walletId}`,
  },
  withdrawRequest: {
    list: '/api/payment-service/withdrawrequest',
    detail: (id: string) => `/api/payment-service/withdrawrequest/${id}`,
    byUser: (userId: string) => `/api/payment-service/withdrawrequest/user/${userId}`,
    myRequests: '/api/payment-service/withdrawrequest/my-requests',
    create: '/api/payment-service/withdrawrequest',
    approve: (id: string) => `/api/payment-service/withdrawrequest/${id}/approve`,
    reject: (id: string) => `/api/payment-service/withdrawrequest/${id}/reject`,
    complete: (id: string) => `/api/payment-service/withdrawrequest/${id}/complete`,
  },
  userBankAccount: {
    detail: (id: string) => `/api/payment-service/userbankaccount/${id}`,
  },
  bank: {
    list: '/api/payment-service/bank',
  },
  certification: {
    pending: '/api/certification/pending',
    detail: (id: string) => `/api/certification/${id}`,
    approve: (id: string) => `/api/certification/${id}/approve`,
    byUser: (userId: string) => `/api/certification/user/${userId}`,
  },
} as const

export * from './messages'

