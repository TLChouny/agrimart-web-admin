export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {["Người dùng", "Đơn hàng", "Doanh thu", "Phê duyệt"].map((title, idx) => (
        <div key={title} className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold mt-2">{(idx + 1) * 123}</p>
        </div>
      ))}
    </div>
  )
}

