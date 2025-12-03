'use client'

import { Card } from '../../components/ui/card'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'

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
  startingPrice = 0,
}: PriceChartProps) {
  // Nếu có data từ bid log thì dùng, nếu không thì dùng dữ liệu mẫu dựa trên giá khởi điểm / hiện tại
  const chartData: PriceDataPoint[] =
    data.length > 0
      ? data
      : [
          { time: 'Bắt đầu', price: startingPrice },
          { time: 'Hiện tại', price: currentPrice || startingPrice },
        ]

  const prices = chartData.map(d => d.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0
  const priceChange = currentPrice - startingPrice
  const percentChange =
    startingPrice !== 0 ? ((priceChange / startingPrice) * 100).toFixed(1) : '0.0'
  const formattedPriceChange = formatCurrencyVND(Math.abs(priceChange))

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
              <span
                className={`text-lg font-bold ${
                  priceChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {priceChange > 0 ? '+' : priceChange < 0 ? '-' : ''}
                {formattedPriceChange} ({percentChange}%)
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              barSize={32}
            >
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
                formatter={(value: number) => [formatCurrencyVND(value), 'Giá']}
                labelStyle={{ color: '#1f2937' }}
              />
              <Bar
                dataKey="price"
                name="Giá đặt"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Giá Thấp Nhất</p>
            <p className="text-lg font-bold text-blue-700">
              {formatCurrencyVND(minPrice)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Giá Hiện Tại</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrencyVND(currentPrice)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Giá Cao Nhất</p>
            <p className="text-lg font-bold text-purple-700">
              {formatCurrencyVND(maxPrice)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
