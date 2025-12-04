'use client'

import { Card } from '../../components/ui/card'
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { formatCurrencyVND } from '../../utils/currency'
import { useEffect, useState } from 'react'

interface PriceDataPoint {
  // timestamp dùng cho tính toán & trục X (ms since epoch)
  timestamp: number
  // label hiển thị dưới trục X
  label: string
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Nếu có data từ bid log thì dùng, nếu không thì dùng dữ liệu mẫu dựa trên giá khởi điểm / hiện tại
  const chartData: PriceDataPoint[] =
    data.length > 0
      ? data
      : [
          {
            timestamp: Date.now(),
            label: 'Bắt đầu',
            price: startingPrice,
          },
          {
            timestamp: Date.now() + 1000,
            label: 'Hiện tại',
            price: currentPrice || startingPrice,
          },
        ]

  // Debug: Log chart data changes
  useEffect(() => {
    console.log('[PriceChart] Chart data updated:', chartData.length, 'points', chartData)
    console.log('[PriceChart] Current price:', currentPrice, 'Starting price:', startingPrice)
  }, [chartData.length, currentPrice, startingPrice, data.length])

  const prices = chartData.map(d => d.price)
  const minPrice = prices.length ? Math.min(...prices) : 0
  const maxPrice = prices.length ? Math.max(...prices) : 0
  const priceChange = currentPrice - startingPrice
  const percentChange =
    startingPrice !== 0 ? ((priceChange / startingPrice) * 100).toFixed(1) : '0.0'
  const formattedPriceChange = formatCurrencyVND(Math.abs(priceChange))

  // Don't render chart until mounted to avoid size calculation issues
  if (!mounted) {
    return (
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Biểu Đồ Giá
              </h3>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2 h-80 flex items-center justify-center">
            <p className="text-gray-500">Đang tải biểu đồ...</p>
          </div>
        </div>
      </Card>
    )
  }

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

        <div className="bg-gray-50 rounded-lg p-2 w-full" style={{ height: '320px', minHeight: '320px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                tickFormatter={(value: number) =>
                  new Date(value).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })
                }
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
              <Line
                type="stepAfter"
                dataKey="price"
                name="Giá đấu"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: '#3b82f6',
                  fill: '#fff',
                }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
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
