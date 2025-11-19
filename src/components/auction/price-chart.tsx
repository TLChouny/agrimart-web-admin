'use client'

import { Card } from '../../components/ui/card'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { TrendingUp } from 'lucide-react'

interface PriceDataPoint {
  time: string
  price: number
}

interface PriceChartProps {
  data?: PriceDataPoint[]
  currentPrice?: number
  startingPrice?: number
}

export function PriceChart({ 
  data = [],
  currentPrice = 0,
  startingPrice = 0
}: PriceChartProps) {
  const chartData = data.length > 0 ? data : [
    { time: '00:00', price: startingPrice },
    { time: '02:00', price: startingPrice + 5000 },
    { time: '04:00', price: startingPrice + 8000 },
    { time: '06:00', price: currentPrice },
  ]

  const minPrice = Math.min(...chartData.map(d => d.price))
  const maxPrice = Math.max(...chartData.map(d => d.price))
  const priceChange = currentPrice - startingPrice
  const percentChange = ((priceChange / startingPrice) * 100).toFixed(1)

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Biểu Đồ Giá
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm text-gray-600">Thay đổi:</span>
              <span className={`text-lg font-bold ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {priceChange >= 0 ? '+' : ''}{priceChange.toLocaleString()} đ ({percentChange}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [value.toLocaleString() + ' đ', 'Giá']}
                labelStyle={{ color: '#1f2937' }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Giá Thấp Nhất</p>
            <p className="text-lg font-bold text-blue-700">{minPrice.toLocaleString()} đ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Giá Hiện Tại</p>
            <p className="text-lg font-bold text-green-700">{currentPrice.toLocaleString()} đ</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Giá Cao Nhất</p>
            <p className="text-lg font-bold text-purple-700">{maxPrice.toLocaleString()} đ</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
