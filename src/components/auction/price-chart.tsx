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
  time: number // timestamp (ms) for proper time scale
  price: number
  label?: string // short label for axis (e.g., dd/MM)
  fullTime?: string // full datetime for tooltip
  durationLabel?: string // human readable duration until next bid
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
  const now = Date.now()
  const chartData: PriceDataPoint[] =
    data.length > 0
      ? data
      : [
          { time: now - 1, price: startingPrice, label: 'Bắt đầu', fullTime: 'Bắt đầu' },
          { time: now, price: currentPrice || startingPrice, label: 'Hiện tại', fullTime: 'Hiện tại' },
        ]

  // Find the latest bid (highest time value)
  const latestBidTime = chartData.length > 0 
    ? Math.max(...chartData.map(d => d.time))
    : null

  // Debug: Log chart data changes
  useEffect(() => {
    console.log('[PriceChart] Chart data updated:', chartData.length, 'points', chartData)
    console.log('[PriceChart] Current price:', currentPrice, 'Starting price:', startingPrice)
  }, [chartData.length, currentPrice, startingPrice, data.length])

  // Tính mức giá đã tăng trong ngày: Giá cao nhất trong ngày - Giá bid đầu tiên trong ngày
  const calculateDailyPriceIncrease = () => {
    if (chartData.length === 0) {
      // Nếu không có data, dùng startingPrice và currentPrice
      return currentPrice - startingPrice
    }

    // Nếu có data từ bid log (data.length > 0), sử dụng data thực tế
    if (data.length > 0) {
      // Giá bid đầu tiên trong ngày là giá của bid đầu tiên
      const firstBidPrice = data[0]?.price ?? startingPrice
      
      // Tìm giá cao nhất trong ngày từ tất cả các bid
      const prices = data.map(d => d.price)
      const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice

      return maxPrice - firstBidPrice
    }

    // Nếu không có data từ bid log, dùng chartData (có thể là mock data)
    // Tìm giá bid đầu tiên (bỏ qua điểm "Bắt đầu" nếu có)
    const bidPoints = chartData.filter(d => d.label !== 'Bắt đầu')
    const firstBidPrice = bidPoints.length > 0 ? bidPoints[0]?.price : startingPrice
    
    // Tìm giá cao nhất trong ngày
    const prices = chartData.map(d => d.price)
    const maxPrice = prices.length > 0 ? Math.max(...prices) : currentPrice

    return maxPrice - firstBidPrice
  }

  const dailyPriceIncrease = calculateDailyPriceIncrease()
  const priceChange = currentPrice - startingPrice // Vẫn dùng cho phần "Thay đổi" ở trên
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
                dataKey="time"
                type="number"
                scale="time"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                domain={['dataMin', 'dataMax']}
                tickFormatter={(value) => {
                  const d = new Date(value)
                  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
                }}
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
                labelFormatter={(label, payload) => {
                  const dataPoint = payload && payload[0]?.payload as PriceDataPoint | undefined
                  
                  // Check if this is the latest bid (highest time)
                  const isLatestBid = latestBidTime !== null && dataPoint?.time === latestBidTime
                  
                  // Prefer fullTime if available, but for latest bid, override to show only date
                  const full = payload && payload[0]?.payload?.fullTime
                  if (full && !isLatestBid) return full
                  
                  // Format date
                  let date: Date | null = null
                  if (dataPoint?.time) {
                    date = new Date(dataPoint.time)
                  } else {
                    // Fallback: try to parse label as timestamp
                    const timestamp = typeof label === 'number' ? label : Number(label)
                    if (!isNaN(timestamp) && timestamp > 0) {
                      date = new Date(timestamp)
                    }
                  }
                  
                  if (date && !isNaN(date.getTime())) {
                    const day = String(date.getDate()).padStart(2, '0')
                    const month = String(date.getMonth() + 1).padStart(2, '0')
                    const year = date.getFullYear()
                    
                    // For latest bid, only show date (no time)
                    if (isLatestBid) {
                      return `${day}/${month}/${year}`
                    }
                    
                    // For other bids, show full time and date
                    const hours = String(date.getHours()).padStart(2, '0')
                    const minutes = String(date.getMinutes()).padStart(2, '0')
                    const seconds = String(date.getSeconds()).padStart(2, '0')
                    return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
                  }
                  
                  return String(label || '')
                }}
                formatter={(value, _name, payload) => {
                  const numValue = typeof value === 'number' ? value : Number(value) || 0
                  const duration = (payload?.payload as PriceDataPoint)?.durationLabel
                  const extra = duration ? ` (${duration})` : ''
                  return [`${formatCurrencyVND(numValue)}${extra}`, 'Giá']
                }}
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
            <p className="text-xs text-gray-600 mb-1">Giá Khởi Điểm</p>
            <p className="text-lg font-bold text-blue-700">
              {formatCurrencyVND(startingPrice)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
            <p className="text-xs text-gray-600 mb-1">Giá Hiện Tại</p>
            <p className="text-lg font-bold text-green-700">
              {formatCurrencyVND(currentPrice)}
            </p>
          </div>
          <div className={`rounded-lg p-3 text-center border ${
            dailyPriceIncrease >= 0 
              ? 'bg-orange-50 border-orange-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <p className="text-xs text-gray-600 mb-1">Mức Giá Đã Tăng Trong Ngày</p>
            <p className={`text-lg font-bold ${
              dailyPriceIncrease >= 0 ? 'text-orange-700' : 'text-red-700'
            }`}>
              {dailyPriceIncrease > 0 ? '+' : ''}{formatCurrencyVND(dailyPriceIncrease)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
