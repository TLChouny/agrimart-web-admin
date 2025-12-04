import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card } from '../../components/ui/card'
import { SimpleTable, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/simple-table'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { walletApi } from '../../services/api/walletApi'
import type { ApiWallet, ApiLedger, Direction, WalletStatus } from '../../types/api'
import { formatCurrencyVND } from '../../utils/currency'
import { useToastContext } from '../../contexts/ToastContext'
import { TOAST_TITLES } from '../../services/constants/messages'
import { Wallet, ArrowUpRight, ArrowDownRight, RefreshCw, Search, Eye } from 'lucide-react'

const WALLET_STATUS_LABELS: Record<WalletStatus, string> = {
  0: 'Hoạt động',
  1: 'Tạm ngưng',
  2: 'Đã đóng',
}

const DIRECTION_LABELS: Record<Direction, string> = {
  1: 'Nạp tiền',
  2: 'Rút tiền',
}

const getDirectionIcon = (direction: Direction) => {
  if (direction === 1) {
    return <ArrowDownRight className="w-4 h-4 text-green-600" />
  }
  return <ArrowUpRight className="w-4 h-4 text-red-600" />
}

const getDirectionBadge = (direction: Direction) => {
  if (direction === 1) {
    return <Badge variant="outline" className="text-green-600 border-green-600">{DIRECTION_LABELS[direction]}</Badge>
  }
  return <Badge variant="outline" className="text-red-600 border-red-600">{DIRECTION_LABELS[direction]}</Badge>
}

const getWalletStatusBadge = (status: WalletStatus) => {
  const colors: Record<WalletStatus, string> = {
    0: 'text-green-600 border-green-600',
    1: 'text-yellow-600 border-yellow-600',
    2: 'text-red-600 border-red-600',
  }
  return (
    <Badge variant="outline" className={colors[status]}>
      {WALLET_STATUS_LABELS[status]}
    </Badge>
  )
}

const formatDateTime = (iso: string) => {
  return new Date(iso).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WalletPage() {
  const { toast } = useToastContext()
  // System wallet state
  const [wallet, setWallet] = useState<ApiWallet | null>(null)
  const [ledgers, setLedgers] = useState<ApiLedger[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [ledgersLoading, setLedgersLoading] = useState<boolean>(false)
  const [searchValue, setSearchValue] = useState<string>('')
  
  // All wallets state
  const [allWallets, setAllWallets] = useState<ApiWallet[]>([])
  const [walletsLoading, setWalletsLoading] = useState<boolean>(false)
  const [walletsSearchValue, setWalletsSearchValue] = useState<string>('')
  const [walletsStatusFilter, setWalletsStatusFilter] = useState<WalletStatus | 'all'>('all')
  const [selectedWallet, setSelectedWallet] = useState<ApiWallet | null>(null)
  const [showLedgersModal, setShowLedgersModal] = useState<boolean>(false)
  const [modalLedgers, setModalLedgers] = useState<ApiLedger[]>([])
  const [modalLedgersLoading, setModalLedgersLoading] = useState<boolean>(false)

  // Fetch system wallet
  const fetchSystemWallet = useCallback(async () => {
    try {
      console.log('[WalletPage] Fetching system wallet...')
      const res = await walletApi.getSystemWallet()
      console.log('[WalletPage] System wallet response:', res)
      
      if (res.isSuccess && res.data) {
        console.log('[WalletPage] Wallet data:', res.data)
        setWallet(res.data)
        return res.data
      } else {
        console.error('[WalletPage] Failed to get wallet:', res.message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải thông tin ví',
          variant: 'destructive',
        })
        return null
      }
    } catch (err) {
      console.error('[WalletPage] Error fetching wallet:', err)
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải thông tin ví'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
      return null
    }
  }, [toast])

  // Fetch ledgers for system wallet
  const fetchLedgers = useCallback(async (walletId: string) => {
    try {
      setLedgersLoading(true)
      console.log('[WalletPage] Fetching ledgers for wallet:', walletId)
      const res = await walletApi.getLedgersByWallet(walletId)
      console.log('[WalletPage] Ledgers response:', res)
      
      if (res.isSuccess && res.data) {
        console.log('[WalletPage] Ledgers data:', res.data)
        const sortedLedgers = [...res.data].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return b.balanceAfter - a.balanceAfter
        })
        setLedgers(sortedLedgers)
      } else {
        console.error('[WalletPage] Failed to get ledgers:', res.message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải lịch sử giao dịch',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('[WalletPage] Error fetching ledgers:', err)
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử giao dịch'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLedgersLoading(false)
    }
  }, [toast])

  // Fetch all wallets
  const fetchAllWallets = useCallback(async () => {
    try {
      console.log('[WalletPage] Fetching all wallets...')
      setWalletsLoading(true)
      const res = await walletApi.getWallets()
      console.log('[WalletPage] All wallets response:', res)
      
      if (res.isSuccess && res.data) {
        console.log('[WalletPage] All wallets data:', res.data)
        setAllWallets(res.data)
      } else {
        console.error('[WalletPage] Failed to get wallets:', res.message)
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải danh sách ví',
          variant: 'destructive',
        })
      }
    } catch (err) {
      console.error('[WalletPage] Error fetching wallets:', err)
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải danh sách ví'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setWalletsLoading(false)
    }
  }, [toast])

  // Fetch ledgers for modal
  const fetchModalLedgers = useCallback(async (walletId: string) => {
    try {
      setModalLedgersLoading(true)
      const res = await walletApi.getLedgersByWallet(walletId)
      
      if (res.isSuccess && res.data) {
        const sortedLedgers = [...res.data].sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          }
          return b.balanceAfter - a.balanceAfter
        })
        setModalLedgers(sortedLedgers)
      } else {
        toast({
          title: TOAST_TITLES.ERROR,
          description: res.message || 'Không thể tải lịch sử giao dịch',
          variant: 'destructive',
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Đã xảy ra lỗi khi tải lịch sử giao dịch'
      toast({
        title: TOAST_TITLES.ERROR,
        description: message,
        variant: 'destructive',
      })
    } finally {
      setModalLedgersLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      const walletData = await fetchSystemWallet()
      if (walletData) {
        await fetchLedgers(walletData.id)
      }
      setLoading(false)
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchAllWallets()
  }, [fetchAllWallets])

  const handleRefresh = () => {
    const loadData = async () => {
      setLoading(true)
      const walletData = await fetchSystemWallet()
      if (walletData) {
        await fetchLedgers(walletData.id)
      }
      setLoading(false)
    }
    loadData()
    fetchAllWallets()
  }

  const handleViewLedgers = async (wallet: ApiWallet) => {
    setSelectedWallet(wallet)
    setShowLedgersModal(true)
    await fetchModalLedgers(wallet.id)
  }

  const filteredLedgers = useMemo(() => {
    if (!searchValue) return ledgers
    const searchLower = searchValue.toLowerCase()
    return ledgers.filter(
      (ledger) =>
        ledger.description.toLowerCase().includes(searchLower) ||
        ledger.transactionId.toLowerCase().includes(searchLower) ||
        ledger.walletId.toLowerCase().includes(searchLower)
    )
  }, [ledgers, searchValue])

  const filteredWallets = useMemo(() => {
    let filtered = allWallets

    if (walletsSearchValue) {
      const searchLower = walletsSearchValue.toLowerCase()
      filtered = filtered.filter(
        (wallet) =>
          wallet.id.toLowerCase().includes(searchLower) ||
          wallet.userId.toLowerCase().includes(searchLower) ||
          wallet.currency.toLowerCase().includes(searchLower)
      )
    }

    if (walletsStatusFilter !== 'all') {
      filtered = filtered.filter((wallet) => wallet.walletStatus === walletsStatusFilter)
    }

    return filtered
  }, [allWallets, walletsSearchValue, walletsStatusFilter])

  const filteredModalLedgers = useMemo(() => {
    return modalLedgers
  }, [modalLedgers])

  return (
    <div className="mx-auto max-w-[1800px] p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Ví của tôi</h1>
        <p className="text-gray-600">Quản lý số dư và lịch sử giao dịch</p>
      </div>

      {/* System Wallet Balance Card */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Số dư hiện tại</p>
              {loading ? (
                <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
              ) : (
                <h2 className="text-3xl font-bold text-gray-900">
                  {wallet ? formatCurrencyVND(wallet.balance) : '—'}
                </h2>
              )}
              {wallet && (
                <div className="mt-3 flex items-center gap-4">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Trạng thái:</span>{' '}
                    {getWalletStatusBadge(wallet.walletStatus)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Loại tiền:</span> {wallet.currency}
                  </div>
                  {wallet.isSystemWallet && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Ví hệ thống
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleRefresh} disabled={loading || ledgersLoading || walletsLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading || ledgersLoading || walletsLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* System Wallet Ledgers Section */}
      <Card className="mb-6">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lịch sử giao dịch</h3>
            <p className="text-sm text-gray-600">
              {ledgersLoading ? 'Đang tải...' : `Tổng ${ledgers.length} giao dịch`}
            </p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo mô tả, mã giao dịch..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Ledgers Table */}
          {ledgersLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : filteredLedgers.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[10%]">Loại</TableHead>
                    <TableHead className="w-[12%]">Số tiền</TableHead>
                    <TableHead className="w-[12%]">Số dư sau</TableHead>
                    <TableHead className="w-[30%]">Mô tả</TableHead>
                    <TableHead className="w-[18%]">Mã giao dịch</TableHead>
                    <TableHead className="w-[18%]">Mã ví</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLedgers.map((ledger, index) => (
                    <TableRow key={ledger.id || `${ledger.transactionId}-${index}`} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(ledger.direction)}
                          {getDirectionBadge(ledger.direction)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-semibold ${
                            ledger.direction === 1 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {ledger.direction === 1 ? '+' : '-'}
                          {formatCurrencyVND(ledger.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-gray-900">
                          {formatCurrencyVND(ledger.balanceAfter)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="truncate max-w-[300px]" title={ledger.description}>
                          {ledger.description || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-600">
                          {ledger.transactionId.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-500">
                          {ledger.walletId.slice(0, 8)}...
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>
          )}
        </div>
      </Card>

      {/* All Wallets Table */}
      <Card>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Danh sách tất cả ví</h3>
              <p className="text-sm text-gray-600">
                {walletsLoading ? 'Đang tải...' : `Tổng ${filteredWallets.length} ví`}
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo ID, User ID, Currency..."
                value={walletsSearchValue}
                onChange={(e) => setWalletsSearchValue(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={walletsStatusFilter}
                onChange={(e) => setWalletsStatusFilter(e.target.value as WalletStatus | 'all')}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value={0}>Hoạt động</option>
                <option value={1}>Tạm ngưng</option>
                <option value={2}>Đã đóng</option>
              </select>
            </div>
          </div>

          {/* Wallets Table */}
          {walletsLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Đang tải danh sách ví...</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Không tìm thấy ví nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <SimpleTable>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[8%]">ID</TableHead>
                    <TableHead className="w-[12%]">User ID</TableHead>
                    <TableHead className="w-[10%]">Số dư</TableHead>
                    <TableHead className="w-[10%]">Loại tiền</TableHead>
                    <TableHead className="w-[12%]">Trạng thái</TableHead>
                    <TableHead className="w-[10%]">Loại ví</TableHead>
                    <TableHead className="w-[12%]">Ngày tạo</TableHead>
                    <TableHead className="w-[16%] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((walletItem) => (
                    <TableRow key={walletItem.id} className="hover:bg-gray-50">
                      <TableCell>
                        <span className="text-xs font-mono text-gray-600">
                          {walletItem.id.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono text-gray-600">
                          {walletItem.userId.slice(0, 8)}...
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">
                          {formatCurrencyVND(walletItem.balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">{walletItem.currency}</span>
                      </TableCell>
                      <TableCell>{getWalletStatusBadge(walletItem.walletStatus)}</TableCell>
                      <TableCell>
                        {walletItem.isSystemWallet ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Hệ thống
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600 border-gray-600">
                            Người dùng
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDateTime(walletItem.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewLedgers(walletItem)}
                          className="h-8 px-3 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Xem giao dịch
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </SimpleTable>
            </div>
          )}
        </div>
      </Card>

      {/* Ledgers Modal */}
      {showLedgersModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLedgersModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Lịch sử giao dịch - Ví {selectedWallet.id.slice(0, 8)}...
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Số dư: {formatCurrencyVND(selectedWallet.balance)} | Loại tiền: {selectedWallet.currency}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLedgersModal(false)}
                className="h-8"
              >
                Đóng
              </Button>
            </div>
            <div className="p-6 overflow-auto flex-1">
              {modalLedgersLoading ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Đang tải lịch sử giao dịch...</p>
                </div>
              ) : filteredModalLedgers.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Chưa có giao dịch nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <SimpleTable>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[10%]">Loại</TableHead>
                        <TableHead className="w-[12%]">Số tiền</TableHead>
                        <TableHead className="w-[12%]">Số dư sau</TableHead>
                        <TableHead className="w-[30%]">Mô tả</TableHead>
                        <TableHead className="w-[18%]">Mã giao dịch</TableHead>
                        <TableHead className="w-[18%]">Thời gian</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredModalLedgers.map((ledger, index) => (
                        <TableRow key={ledger.id || `${ledger.transactionId}-${index}`} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getDirectionIcon(ledger.direction)}
                              {getDirectionBadge(ledger.direction)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-semibold ${
                                ledger.direction === 1 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {ledger.direction === 1 ? '+' : '-'}
                              {formatCurrencyVND(ledger.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900">
                              {formatCurrencyVND(ledger.balanceAfter)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="truncate max-w-[300px]" title={ledger.description}>
                              {ledger.description || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-mono text-gray-600">
                              {ledger.transactionId.slice(0, 8)}...
                            </span>
                          </TableCell>
                          <TableCell>
                            {ledger.createdAt ? (
                              <span className="text-sm text-gray-600">
                                {formatDateTime(ledger.createdAt)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </SimpleTable>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
