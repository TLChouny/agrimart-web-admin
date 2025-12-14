import { LineChart as RechartsLineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts"

interface LineChartProps {
  data: Array<{ [key: string]: string | number }>
  isLoading?: boolean
  xKey: string
  yKey?: string
  lines?: Array<{ key: string; label: string; color: string }>
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

export function LineChart({ data, isLoading, xKey, yKey, lines, height = 300 }: LineChartProps) {
  if (isLoading) return <ChartSkeleton />
  if (!data || data.length === 0) return <EmptyState />

  // Nếu có lines array, dùng nó; nếu không, dùng yKey đơn
  const chartLines = lines || (yKey ? [{ key: yKey, label: yKey, color: '#3b82f6' }] : [])

  return (
    <div style={{ height: `${height}px` }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
            formatter={(value: any, name: string) => {
              // Custom formatter để thay "accounts" bằng "Tài khoản"
              if (name === 'accounts' || name === 'account') {
                return [value, 'Tài khoản']
              }
              return [value, name]
            }}
          />
          <Legend />
          {chartLines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name={line.label}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

