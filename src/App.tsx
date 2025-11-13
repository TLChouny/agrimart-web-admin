import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AdminLoginPage from './pages/auth/AdminLoginPage'
import AdminDashboardPage from './pages/Admin/DashboardPage'
import UsersPage from './pages/Admin/UsersPage'
import ApprovalPage from './pages/Admin/ApprovalPage'
import FarmsPage from './pages/Admin/FarmsPage'
import CropsPage from './pages/Admin/CropsPage'
import CategoriesPage from './pages/Admin/CategoriesPage'
import HarvestsPage from './pages/Admin/HarvestsPage'
import OrdersPage from './pages/Admin/OrdersPage'
import ProductsPage from './pages/Admin/ProductsPage'
import ShippersPage from './pages/Admin/ShippersPage'
import AuctionsPage from './pages/Admin/AuctionsPage'
import AdminSettingsPage from './pages/Admin/SettingsPage'
import AdminHelpPage from './pages/Admin/HelpPage'
import AdminLayout from './layouts/AdminLayout'
import { ROUTES } from './constants'
import { useAuth } from './contexts/AuthContext'

function App() {
  const { user } = useAuth()

  return (
    <Router>
      <Routes>
        {/* Admin routes */}
        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <AdminDashboardPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_USERS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <UsersPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_APPROVAL}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <ApprovalPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_FARMS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <FarmsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_CROPS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <CropsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_CATEGORIES}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <CategoriesPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_HARVESTS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <HarvestsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_ORDERS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <OrdersPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_PRODUCTS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <ProductsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path={ROUTES.ADMIN_SHIPPERS}
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <ShippersPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path="/admin/auctions"
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <AuctionsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path="/admin/settings"
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <AdminSettingsPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        <Route
          path="/admin/help"
          element={
            user && user.role === 'admin' ? (
              <AdminLayout>
                <AdminHelpPage />
              </AdminLayout>
            ) : (
              <Navigate to={ROUTES.ADMIN_LOGIN} replace />
            )
          }
        />

        {/* Admin auth */}
        <Route
          path={ROUTES.ADMIN_LOGIN}
          element={
            user && user.role === 'admin' ? (
              <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
            ) : (
              <AdminLoginPage />
            )
          }
        />

        {/* Fallback to admin login */}
        <Route path="*" element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />} />
      </Routes>
    </Router>
  )
}

export default App

