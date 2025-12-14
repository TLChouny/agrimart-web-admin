import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts"

interface StackedBarChartProps {
  data: Array<{ [key: string]: string | number }>
  isLoading?: boolean
  xKey: string
  bars: Array<{ key: string; label: string; color: string }>
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

export function StackedBarChart({ data, isLoading, xKey, bars, height = 300 }: StackedBarChartProps) {
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
          />
          <Tooltip
            labelStyle={{ color: '#374151' }}
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
          />
          <Legend />
          {bars.map((bar) => (
            <Bar
              key={bar.key}
              dataKey={bar.key}
              stackId="a"
              fill={bar.color}
              radius={[0, 0, 0, 0]}
              name={bar.label}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

