import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Award, TrendingUp } from "lucide-react"

interface ReputationUser {
  id: string
  name: string
  email: string
  reputationScore: number
  auctionCount: number
  successfulAuctions?: number
  role: 'farmer' | 'wholesaler'
}

interface ReputationRankingProps {
  farmers: ReputationUser[]
  wholesalers: ReputationUser[]
  isLoading?: boolean
}

function RankingSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

function RankingList({ users, role }: { users: ReputationUser[]; role: 'farmer' | 'wholesaler' }) {
  if (users.length === 0) {
    return (
      <div className="text-center text-sm text-gray-500 py-8 border border-dashed rounded-lg">
        Chưa có dữ liệu {role === 'farmer' ? 'nông dân' : 'thương lái'} nào.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {users.map((user, index) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
              index === 0 ? 'bg-yellow-100 text-yellow-700' :
              index === 1 ? 'bg-gray-100 text-gray-700' :
              index === 2 ? 'bg-orange-100 text-orange-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-900">{user.reputationScore}</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <p className="text-xs text-gray-500">
                  {role === 'farmer' 
                    ? `${user.auctionCount} đấu giá đã tạo`
                    : `${user.auctionCount} phiên tham gia`
                  }
                </p>
                {user.successfulAuctions !== undefined && user.successfulAuctions > 0 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    {user.successfulAuctions} {role === 'farmer' ? 'đấu giá thành công' : 'đấu giá thắng'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function ReputationRanking({ farmers, wholesalers, isLoading }: ReputationRankingProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-yellow-100">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent border-b border-yellow-50">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-yellow-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-yellow-600" />
            </div>
            Top 5 Nông dân uy tín
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <RankingSkeleton />
          ) : (
            <RankingList users={farmers} role="farmer" />
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-100">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-transparent border-b border-blue-50">
          <CardTitle className="text-lg font-semibold flex items-center gap-2 text-gray-900">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            Top 5 Thương lái uy tín
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoading ? (
            <RankingSkeleton />
          ) : (
            <RankingList users={wholesalers} role="wholesaler" />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

