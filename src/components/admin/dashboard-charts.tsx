import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { ColumnChart } from "./charts/ColumnChart"
import { LineChart } from "./charts/LineChart"
import { StackedBarChart } from "./charts/StackedBarChart"
import { DonutChart } from "./charts/DonutChart"

// System Revenue Analysis - Column Chart
export function SystemRevenueChart({ data, isLoading }: { data: Array<{ time: string; profit: number }>; isLoading?: boolean }) {
  return (
    <Card className="border-blue-100">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-blue-50">
        <CardTitle className="text-lg font-semibold text-gray-900">Phân tích doanh thu hệ thống</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Lợi nhuận hệ thống theo thời gian (12 tháng gần nhất)</p>
      </CardHeader>
      <CardContent className="pt-6">
        <ColumnChart data={data} isLoading={isLoading} xKey="time" yKey="profit" height={350} />
      </CardContent>
    </Card>
  )
}

// User Growth Trend - Line Chart
export function UserGrowthChart({ data, isLoading }: { data: Array<{ month: string; accounts: number }>; isLoading?: boolean }) {
  return (
    <Card className="border-purple-100">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-transparent border-b border-purple-50">
        <CardTitle className="text-lg font-semibold text-gray-900">Xu hướng tăng trưởng người dùng</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Số lượng tài khoản mới theo tháng</p>
      </CardHeader>
      <CardContent className="pt-6">
        <LineChart data={data} isLoading={isLoading} xKey="month" yKey="accounts" height={300} />
      </CardContent>
    </Card>
  )
}

// Auction Lifecycle Overview - Stacked Bar Chart
export function AuctionLifecycleChart({ 
  data, 
  isLoading 
}: { 
  data: Array<{ 
    month: string; 
    approved: number; 
    rejected: number; 
    ongoing: number; 
    completed: number; 
    failed: number 
  }>; 
  isLoading?: boolean 
}) {
  return (
    <Card className="border-orange-100">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-transparent border-b border-orange-50">
        <CardTitle className="text-lg font-semibold text-gray-900">Tổng quan vòng đời đấu giá</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Phân bổ trạng thái đấu giá theo tháng (12 tháng gần nhất)</p>
      </CardHeader>
      <CardContent className="pt-6">
        <StackedBarChart 
          data={data} 
          isLoading={isLoading} 
          xKey="month"
          bars={[
            { key: 'approved', label: 'Đã duyệt', color: '#10b981' },
            { key: 'rejected', label: 'Từ chối', color: '#ef4444' },
            { key: 'ongoing', label: 'Đang diễn ra', color: '#3b82f6' },
            { key: 'completed', label: 'Hoàn tất', color: '#8b5cf6' },
            { key: 'failed', label: 'Thất bại', color: '#f59e0b' },
          ]}
          height={350}
        />
      </CardContent>
    </Card>
  )
}

// Risk Monitoring - Line Chart (2 lines)
export function RiskMonitoringChart({ 
  data, 
  isLoading 
}: { 
  data: Array<{ 
    time: string; 
    reports: number; 
    disputes: number 
  }>; 
  isLoading?: boolean 
}) {
  return (
    <Card className="border-red-100">
      <CardHeader className="bg-gradient-to-r from-red-50 to-transparent border-b border-red-50">
        <CardTitle className="text-lg font-semibold text-gray-900">Giám sát rủi ro</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Số lượng báo cáo và tranh chấp theo thời gian (12 tháng gần nhất)</p>
      </CardHeader>
      <CardContent className="pt-6">
        <LineChart 
          data={data} 
          isLoading={isLoading} 
          xKey="time"
          lines={[
            { key: 'reports', label: 'Báo cáo', color: '#ef4444' },
            { key: 'disputes', label: 'Tranh chấp', color: '#f59e0b' },
          ]}
          height={350}
        />
      </CardContent>
    </Card>
  )
}

// Biến động ví hệ thống - Donut Chart
export function RevenueSourceChart({ 
  data, 
  isLoading 
}: { 
  data: Array<{ 
    name: string; 
    value: number 
  }>; 
  isLoading?: boolean 
}) {
  return (
    <Card className="border-indigo-100">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-transparent border-b border-indigo-50">
        <CardTitle className="text-lg font-semibold text-gray-900">Biến động ví hệ thống</CardTitle>
        <p className="text-sm text-gray-600 mt-1">Phân bổ tiền vào và tiền ra từ biến động số dư</p>
      </CardHeader>
      <CardContent className="pt-6">
        <DonutChart 
          data={data} 
          isLoading={isLoading}
          colors={['#10b981', '#ef4444']}
          height={300}
        />
      </CardContent>
    </Card>
  )
}

