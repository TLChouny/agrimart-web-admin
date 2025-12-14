import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts"
import { formatCurrencyVND } from "../../../utils/currency"

interface ColumnChartProps {
  data: Array<{ [key: string]: string | number }>
  isLoading?: boolean
  xKey: string
  yKey: string
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

export function ColumnChart({ data, isLoading, xKey, yKey, height = 300 }: ColumnChartProps) {
  if (isLoading) return <ChartSkeleton />
  if (!data || data.length === 0) return <EmptyState />

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey={xKey} 
            axisLine={false} 
            tickLine={false} 
            className="text-xs"
            tick={{ fill: '#6b7280' }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#6b7280' }}
            tickFormatter={(value) => {
              if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
              if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
              return value.toString()
            }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              // Custom formatter để thay "profit" bằng "Lợi nhuận"
              const formattedValue = formatCurrencyVND(value)
              const formattedName = name === 'profit' ? 'Lợi nhuận' : name
              return [formattedValue, formattedName]
            }}
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Bar
            dataKey={yKey}
            name={yKey === 'profit' ? 'Lợi nhuận' : yKey}
            fill="#10b981"
            radius={[8, 8, 0, 0]}
            className="fill-emerald-600"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

