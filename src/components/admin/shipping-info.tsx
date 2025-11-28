import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { Clock, CheckCircle, ShieldCheck, PlayCircle } from "lucide-react"
import type { ElementType } from "react"

export type AuctionStep = "Tạo phiên" | "Xác thực" | "Đang diễn ra" | "Kết thúc"

export interface AuctionProgressStep {
  label: AuctionStep
  time?: string
  completed?: boolean
  current?: boolean
}

export interface AuctionProgressItem {
  id: string
  title: string
  status: string
  badgeTone: "blue" | "green" | "yellow" | "red"
  steps: AuctionProgressStep[]
}

interface ShippingInfoProps {
  auctions: AuctionProgressItem[]
  isLoading?: boolean
}

const stepIcons: Record<AuctionStep, ElementType> = {
  "Tạo phiên": Clock,
  "Xác thực": ShieldCheck,
  "Đang diễn ra": PlayCircle,
  "Kết thúc": CheckCircle,
}

function AuctionSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={`auction-skeleton-${index}`} className="border rounded-lg p-4 animate-pulse space-y-3">
          <div className="h-4 w-1/2 bg-gray-200 rounded" />
          <div className="h-3 w-1/3 bg-gray-100 rounded" />
          <div className="h-3 w-full bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  )
}

const badgeClassName: Record<AuctionProgressItem["badgeTone"], string> = {
  blue: "bg-blue-100 text-blue-800",
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
}

export function ShippingInfo({ auctions, isLoading }: ShippingInfoProps) {
  const hasAuctions = auctions.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Trạng thái các phiên đấu giá</CardTitle>
          <Link to="/admin/auctions">
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AuctionSkeleton />
        ) : hasAuctions ? (
          <div className="space-y-6">
            {auctions.map(auc => (
              <div key={auc.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium truncate pr-4">#{auc.id} · {auc.title}</div>
                  <Badge className={badgeClassName[auc.badgeTone]}>{auc.status}</Badge>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-gray-700">Tiến trình phiên:</h4>
                  <div className="flex items-center gap-3 overflow-x-auto py-2">
                    {auc.steps.map((step, index) => {
                      const Icon = stepIcons[step.label]
                      const isLast = index === auc.steps.length - 1
                      return (
                        <div key={`${auc.id}-${step.label}-${index}`} className="flex items-center gap-3 min-w-max">
                          <div className="flex flex-col items-center min-w-[88px]">
                            <div
                              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                                step.completed
                                  ? "bg-green-500 border-green-500 text-white"
                                  : step.current
                                    ? "bg-blue-500 border-blue-500 text-white"
                                    : "bg-white border-gray-300 text-gray-400"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <p
                              className={`mt-2 text-xs font-medium text-center ${
                                step.completed || step.current ? "text-gray-900" : "text-gray-500"
                              }`}
                            >
                              {step.label}
                            </p>
                            {step.time && <span className="text-[10px] text-gray-500 mt-1">{step.time}</span>}
                            {step.current && <span className="text-[10px] text-blue-600 mt-1">Đang xử lý...</span>}
                          </div>
                          {!isLast && <div className={`h-0.5 w-10 sm:w-16 ${step.completed ? "bg-green-500" : "bg-gray-200"}`} />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
            Chưa có phiên đấu giá nào gần đây.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ShippingInfo

