import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { formatCurrencyVND } from "../../../utils/currency"

interface DonutChartProps {
  data: Array<{ name: string; value: number }>
  isLoading?: boolean
  colors?: string[]
  height?: number
}

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
      <p>Chưa có dữ liệu để hiển thị.</p>
    </div>
  )
}

export function DonutChart({ data, isLoading, colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'], height = 300 }: DonutChartProps) {
  if (isLoading) return <ChartSkeleton />
  if (!data || data.length === 0) return <EmptyState />

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={(props: any) => {
              const { name, percent } = props
              return `${name}: ${((percent as number) * 100).toFixed(0)}%`
            }}
            outerRadius={80}
            innerRadius={50}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [
              formatCurrencyVND(value),
              `Tỷ lệ: ${((value / total) * 100).toFixed(1)}%`
            ]}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend 
            formatter={(value) => {
              const item = data.find(d => d.name === value)
              return item ? `${value}: ${formatCurrencyVND(item.value)}` : value
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

