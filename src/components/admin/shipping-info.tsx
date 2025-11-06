import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Link } from "react-router-dom"
import { Clock, CheckCircle, ShieldCheck, PlayCircle } from "lucide-react"
import type { ElementType } from "react"

type AuctionStep = "Tạo phiên" | "Xác thực" | "Đang diễn ra" | "Kết thúc"

const recentAuctions = [
  {
    id: "AUC-001",
    title: "Phiên đấu giá nông sản tuần 45",
    status: "Đã lên lịch",
    currentStep: 1,
    steps: [
      { label: "Tạo phiên" as AuctionStep, time: "08:30", completed: true },
      { label: "Xác thực" as AuctionStep, time: "", completed: false, current: true },
      { label: "Đang diễn ra" as AuctionStep, time: "", completed: false },
      { label: "Kết thúc" as AuctionStep, time: "", completed: false },
    ],
  },
  {
    id: "AUC-002",
    title: "Đấu giá đặc biệt cuối tháng",
    status: "Đã kết thúc",
    currentStep: 3,
    steps: [
      { label: "Tạo phiên" as AuctionStep, time: "07:00", completed: true },
      { label: "Xác thực" as AuctionStep, time: "07:30", completed: true },
      { label: "Đang diễn ra" as AuctionStep, time: "09:00", completed: true },
      { label: "Kết thúc" as AuctionStep, time: "10:15", completed: true, current: true },
    ],
  },
]

const stepIcons: Record<AuctionStep, ElementType> = {
  "Tạo phiên": Clock,
  "Xác thực": ShieldCheck,
  "Đang diễn ra": PlayCircle,
  "Kết thúc": CheckCircle,
}

export function ShippingInfo() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Thông tin đấu giá - Theo mốc trạng thái</CardTitle>
          <Link to="/admin/auctions">
            <Button variant="outline" size="sm">Xem tất cả</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {recentAuctions.map((auc) => (
            <div key={auc.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">#{auc.id} · {auc.title}</div>
                <Badge className={auc.currentStep === 3 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                  {auc.status}
                </Badge>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-700">Tiến trình phiên:</h4>
                <div className="flex items-center gap-3 overflow-x-auto py-2">
                  {auc.steps.map((step, index) => {
                    const Icon = stepIcons[step.label]
                    const isLast = index === auc.steps.length - 1
                    return (
                      <div key={index} className="flex items-center gap-3 min-w-max">
                        <div className="flex flex-col items-center min-w-[88px]">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            step.completed ? "bg-green-500 border-green-500 text-white" : step.current ? "bg-blue-500 border-blue-500 text-white" : "bg-white border-gray-300 text-gray-400"
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className={`mt-2 text-xs font-medium text-center ${step.completed || step.current ? "text-gray-900" : "text-gray-500"}`}>{step.label}</p>
                          {step.time && <span className="text-[10px] text-gray-500 mt-1">{step.time}</span>}
                          {step.current && <span className="text-[10px] text-blue-600 mt-1">Đang xử lý...</span>}
                        </div>
                        {!isLast && (
                          <div className={`h-0.5 w-10 sm:w-16 ${step.completed ? "bg-green-500" : "bg-gray-200"}`}></div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default ShippingInfo

