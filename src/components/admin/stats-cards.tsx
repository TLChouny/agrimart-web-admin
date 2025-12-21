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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={`stat-skeleton-${index}`} className="border-gray-200">
          <CardContent className="p-4 sm:p-5 md:p-6">
            <div className="space-y-3 sm:space-y-4 animate-pulse">
              <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 rounded" />
              <div className="h-6 sm:h-8 w-24 sm:w-32 bg-gray-200 rounded" />
              <div className="h-2 sm:h-3 w-16 sm:w-20 bg-gray-200 rounded" />
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
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {stats.map((stat, index) => {
        const isHighlight = !!stat.highlight
        return (
          <Card
            key={`stat-${stat.title}-${index}`}
            className={`group relative overflow-hidden transition-all duration-300 ${
              isHighlight 
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20 border-emerald-400" 
                : "border-gray-200 hover:border-gray-300 bg-white"
            }`}
          >
            {!isHighlight && (
              <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            )}
            <CardContent className="p-4 sm:p-5 relative z-10">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <h3 className={`text-[10px] sm:text-xs font-medium uppercase tracking-wide line-clamp-2 ${
                  isHighlight ? "text-emerald-50" : "text-gray-500"
                }`}>
                  {stat.title}
                </h3>
                <ArrowUpRight className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ml-1 ${
                  isHighlight ? "text-emerald-100" : "text-gray-400"
                }`} />
              </div>
              <div className="space-y-1 sm:space-y-1.5">
                <p className={`text-lg sm:text-xl md:text-2xl font-bold ${
                  isHighlight ? "text-white" : "text-gray-900"
                }`}>
                  {stat.value}
                </p>
                {stat.change && (
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs">
                    {trendIcon(stat.trend)}
                    <span className={`line-clamp-1 ${isHighlight ? "text-emerald-50" : "text-gray-500"}`}>
                      {stat.change}
                    </span>
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

