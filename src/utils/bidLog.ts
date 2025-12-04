import type { ApiAuctionBidLog } from '../types/api'

export type BidLogDetails = {
  bidAmount?: number
  isAutoBid?: boolean
  autoBidMaxLimit?: number
  isWinning?: boolean
  isCancelled?: boolean
}

const parseNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.replace(/,/g, ''))
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }
  return undefined
}

const parseBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value === 1
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes'].includes(normalized)) return true
    if (['false', '0', 'no'].includes(normalized)) return false
  }
  return undefined
}

const parsePayload = (raw: string | null): Record<string, unknown> | null => {
  if (!raw) return null
  try {
    const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (payload && typeof payload === 'object') {
      return payload as Record<string, unknown>
    }
  } catch {
    // Ignore malformed payloads
  }
  return null
}

const extractBidObject = (payload: Record<string, unknown> | null) => {
  if (!payload) return null
  const candidate =
    payload['Bid'] ??
    payload['bid'] ??
    payload['BID'] ??
    (typeof payload === 'object' ? payload : null)

  if (candidate && typeof candidate === 'object') {
    return candidate as Record<string, unknown>
  }
  return null
}

export const extractBidDetailsFromLog = (log: ApiAuctionBidLog): BidLogDetails | null => {
  const payload = parsePayload(log.newEntity) ?? parsePayload(log.oldEntity)
  if (!payload) return null

  const bid = extractBidObject(payload)
  if (!bid) return null

  const bidAmount =
    parseNumber(bid['BidAmount'] ?? bid['bidAmount'] ?? bid['amount'] ?? bid['price']) ??
    parseNumber(payload['currentPrice'] ?? payload['newPrice'] ?? payload['price'] ?? payload['amount'])

  const autoBidMaxLimit = parseNumber(bid['AutoBidMaxLimit'] ?? bid['autoBidMaxLimit'])
  const isAutoBid = parseBoolean(bid['IsAutoBid'] ?? bid['isAutoBid'])
  const isWinning = parseBoolean(bid['IsWinning'] ?? bid['isWinning'])
  const isCancelled = parseBoolean(bid['IsCancelled'] ?? bid['isCancelled'])

  if (
    bidAmount === undefined &&
    autoBidMaxLimit === undefined &&
    isAutoBid === undefined &&
    isWinning === undefined &&
    isCancelled === undefined
  ) {
    return null
  }

  return {
    bidAmount,
    autoBidMaxLimit,
    isAutoBid,
    isWinning,
    isCancelled,
  }
}

export const extractBidAmountFromLog = (log: ApiAuctionBidLog): number | null => {
  const details = extractBidDetailsFromLog(log)
  if (details?.bidAmount !== undefined) {
    return details.bidAmount
  }

  const payload = parsePayload(log.newEntity) ?? parsePayload(log.oldEntity)
  if (!payload) return null

  const fallback = parseNumber(payload['currentPrice'] ?? payload['newPrice'] ?? payload['price'] ?? payload['amount'])
  return fallback ?? null
}

