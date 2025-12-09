import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrencyVND } from "../../utils/currency"
import { Button } from "../ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export interface RevenuePoint {
  label: string
  credit: number // Tiền vào (direction = 1)
  debit: number // Tiền ra (direction = 2)
}

interface RevenueAnalyticsProps {
  title?: string
  subtitle?: string
  data: RevenuePoint[]
  isLoading?: boolean
  viewMode?: "month" | "year"
  onViewModeChange?: (mode: "month" | "year") => void
  onPrevious?: () => void
  onNext?: () => void
  canGoPrevious?: boolean
  canGoNext?: boolean
  currentPeriod?: string
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
  title = "Phân tích doanh thu",
  subtitle = "Dòng tiền vào/ra theo biến động số dư",
  data,
  isLoading,
  viewMode = "month",
  onViewModeChange,
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
  currentPeriod,
}: RevenueAnalyticsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {onViewModeChange && (
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant={viewMode === "month" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("month")}
                  className="h-8 px-3 text-xs"
                >
                  Tháng
                </Button>
                <Button
                  variant={viewMode === "year" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("year")}
                  className="h-8 px-3 text-xs"
                >
                  Năm
                </Button>
              </div>
            )}
            {onPrevious && onNext && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  disabled={!canGoPrevious}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {currentPeriod && (
                  <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
                    {currentPeriod}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNext}
                  disabled={!canGoNext}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
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
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatChartCurrency(value),
                    name === "credit" ? "Tiền vào" : "Tiền ra",
                  ]}
                />
                <Legend
                  formatter={(value) => (value === "credit" ? "Tiền vào" : "Tiền ra")}
                  wrapperStyle={{ paddingTop: "20px" }}
                />
                <Bar
                  dataKey="credit"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  className="fill-emerald-600"
                  name="credit"
                />
                <Bar
                  dataKey="debit"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  className="fill-red-500"
                  name="debit"
                />
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

