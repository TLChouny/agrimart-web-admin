import { Card, CardContent } from "../ui/card"
import { TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react"

export type DashboardStatTrend = "up" | "down" | "neutral"

export interface DashboardStatCard {
  title: string
  value: string
  change?: string
  trend?: DashboardStatTrend
  highlight?: boolean
}

interface StatsCardsProps {
  stats: DashboardStatCard[]
  isLoading?: boolean
}

function StatSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={`stat-skeleton-${index}`} className="border-gray-200">
          <CardContent className="p-6">
            <div className="space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-8 w-32 bg-gray-200 rounded" />
              <div className="h-3 w-20 bg-gray-200 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="border-dashed border-gray-200">
      <CardContent className="p-6 text-center text-sm text-gray-500">
        Chưa có dữ liệu tổng quan. Hãy kiểm tra lại sau.
      </CardContent>
    </Card>
  )
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) return <StatSkeleton />
  if (!stats.length) return <EmptyState />

  const trendIcon = (trend?: DashboardStatTrend) => {
    if (trend === "up") return <TrendingUp className="w-3 h-3 text-emerald-500" />
    if (trend === "down") return <TrendingDown className="w-3 h-3 text-red-500" />
    return <Minus className="w-3 h-3 text-gray-400" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const isHighlight = !!stat.highlight
        return (
          <Card
            key={`stat-${stat.title}-${index}`}
            className={`${isHighlight ? "bg-emerald-600 text-white" : "border-gray-200"}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${isHighlight ? "text-emerald-100" : "text-gray-600"}`}>
                  {stat.title}
                </h3>
                <ArrowUpRight className={`w-4 h-4 ${isHighlight ? "text-emerald-200" : "text-gray-400"}`} />
              </div>
              <div className="space-y-2">
                <p className={`text-3xl font-bold ${isHighlight ? "text-white" : "text-gray-900"}`}>{stat.value}</p>
                {stat.change && (
                  <div className="flex items-center gap-1 text-xs">
                    {trendIcon(stat.trend)}
                    <span className={isHighlight ? "text-emerald-100" : "text-gray-500"}>{stat.change}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsCards

