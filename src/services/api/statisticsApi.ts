import { ENDPOINTS } from '../constants/apiConstants'
import { httpClient } from './httpClient'
import type { SystemProfitSummary } from '../../types/api'

class StatisticsApi {
  getSystemProfit(params?: { startDate?: string; endDate?: string; timeRange?: 'daily' | 'monthly' }) {
    return httpClient.get<SystemProfitSummary>(ENDPOINTS.statistics.systemProfit, {
      cacheTTL: 60 * 1000,
      params,
    })
  }

  getSystemProfitCurrentMonth() {
    return httpClient.get<SystemProfitSummary>(ENDPOINTS.statistics.systemProfitCurrentMonth, {
      cacheTTL: 60 * 1000,
    })
  }

  getSystemProfitCurrentYear() {
    return httpClient.get<SystemProfitSummary>(ENDPOINTS.statistics.systemProfitCurrentYear, {
      cacheTTL: 60 * 1000,
    })
  }
}

export const statisticsApi = new StatisticsApi()

