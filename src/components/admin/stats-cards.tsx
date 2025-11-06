import { Card, CardContent } from "../ui/card"
import { TrendingUp, ArrowUpRight } from "lucide-react"

const stats = [
  {
    title: "Tổng nông trại",
    value: "156",
    change: "Tăng từ tháng trước",
    trend: "up",
    color: "emerald",
    bgColor: "bg-emerald-600",
  },
  {
    title: "Nông trại chờ xét duyệt",
    value: "12",
    change: "Đang xem xét",
    trend: "neutral",
    color: "gray",
    bgColor: "bg-white",
  },
  {
    title: "Phiên đấu giá đang xử lý",
    value: "89",
    change: "Tăng từ tháng trước",
    trend: "up",
    color: "gray",
    bgColor: "bg-white",
  },
  {
    title: "Đơn hàng hoàn thành",
    value: "2,847",
    change: "Tăng từ tháng trước",
    trend: "up",
    color: "gray",
    bgColor: "bg-white",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <Card key={index} className={`${stat.bgColor} ${stat.color === "emerald" ? "text-white" : ""} border-gray-200`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-medium ${stat.color === "emerald" ? "text-emerald-100" : "text-gray-600"}`}>
                {stat.title}
              </h3>
              <ArrowUpRight className={`w-4 h-4 ${stat.color === "emerald" ? "text-emerald-200" : "text-gray-400"}`} />
            </div>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${stat.color === "emerald" ? "text-white" : "text-gray-900"}`}>
                {stat.value}
              </p>
              <div className="flex items-center gap-1">
                {stat.trend === "up" && (
                  <TrendingUp
                    className={`w-3 h-3 ${stat.color === "emerald" ? "text-emerald-200" : "text-emerald-600"}`}
                  />
                )}
                <span className={`text-xs ${stat.color === "emerald" ? "text-emerald-200" : "text-gray-500"}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export default StatsCards

