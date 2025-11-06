import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

const data = [
  { month: "T1", revenue: 125000000 },
  { month: "T2", revenue: 180000000 },
  { month: "T3", revenue: 165000000 },
  { month: "T4", revenue: 220000000 },
  { month: "T5", revenue: 195000000 },
  { month: "T6", revenue: 240000000 },
  { month: "T7", revenue: 210000000 },
  { month: "T8", revenue: 275000000 },
  { month: "T9", revenue: 255000000 },
  { month: "T10", revenue: 290000000 },
  { month: "T11", revenue: 320000000 },
  { month: "T12", revenue: 350000000 },
]

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function RevenueAnalytics() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Phân tích doanh thu theo tháng</CardTitle>
        <p className="text-sm text-gray-600">Doanh thu từ bán nông sản trong năm 2024</p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} className="text-xs" />
              <YAxis hide />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Doanh thu"]}
                labelFormatter={(label) => `Tháng ${label}`}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} className="fill-emerald-600" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default RevenueAnalytics

