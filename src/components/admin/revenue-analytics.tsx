import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { formatCurrencyVND } from "../../utils/currency"

export interface RevenuePoint {
  label: string
  value: number
}

interface RevenueAnalyticsProps {
  title?: string
  subtitle?: string
  data: RevenuePoint[]
  isLoading?: boolean
}

const formatChartCurrency = (value: number) => formatCurrencyVND(value, { fallback: "0 VND" })

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-full h-48 bg-gray-100 rounded-lg animate-pulse" />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="h-64 flex flex-col items-center justify-center text-sm text-gray-500">
      <p>Chưa có dữ liệu doanh thu để hiển thị.</p>
      <p>Vui lòng thử lại sau.</p>
    </div>
  )
}

export function RevenueAnalytics({
  title = "Phân tích doanh thu theo tháng",
  subtitle = "Tổng hợp giá trị phiên đấu giá đã hoàn tất",
  data,
  isLoading,
}: RevenueAnalyticsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <p className="text-sm text-gray-600">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ChartSkeleton />
        ) : data.length ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} className="text-xs" />
                <YAxis hide />
                <Tooltip formatter={(value: number) => [formatChartCurrency(value), "Doanh thu"]} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} className="fill-emerald-600" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  )
}

export default RevenueAnalytics

