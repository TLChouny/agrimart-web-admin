import type { PropsWithChildren } from 'react'
import '../styles/admin.css'
import DashboardSidebar from '../components/admin/dashboard-sidebar'
import DashboardHeader from '../components/admin/dashboard-header'

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

