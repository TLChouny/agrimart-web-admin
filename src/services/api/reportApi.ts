import { httpClient } from './httpClient'
import { ENDPOINTS } from '../constants/apiConstants'
import type { APIResponse, PaginatedReports, ReportItem, ReportListParams, ReportStatus } from '../../types/api'

const DEFAULT_PAGE_NUMBER = 1
const DEFAULT_PAGE_SIZE = 10

export const reportApi = {
  async getReports(params: ReportListParams = {}): Promise<APIResponse<PaginatedReports>> {
    const { status, type, pageNumber = DEFAULT_PAGE_NUMBER, pageSize = DEFAULT_PAGE_SIZE } = params

    return httpClient.get<PaginatedReports>(ENDPOINTS.report.list, {
      cache: false,
      params: {
        pageNumber,
        pageSize,
        ...(status && { status }),
        ...(type && { type }),
      },
    })
  },

  async getReportsByAuctionId(auctionId: string): Promise<APIResponse<PaginatedReports>> {
    return httpClient.get<PaginatedReports>(ENDPOINTS.report.byAuction(auctionId), {
      cache: false,
    })
  },

  async updateReportStatus(id: string, reportStatus: ReportStatus): Promise<APIResponse<ReportItem>> {
    return httpClient.put<ReportItem>(ENDPOINTS.report.detail(id), { reportStatus }, { invalidateCache: ENDPOINTS.report.list })
  },
}

