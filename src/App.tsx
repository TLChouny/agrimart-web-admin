// App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './contexts/AuthContext';
import AdminLayout from './layouts/AdminLayout';

import AdminLoginPage from './pages/auth/AdminLoginPage';
import AdminDashboardPage from './pages/Admin/DashboardPage';
import UsersPage from './pages/Admin/UsersPage';
import ApprovalPage from './pages/Admin/ApprovalPage';
import FarmsPage from './pages/Admin/FarmsPage';
import CropsPage from './pages/Admin/CropsPage';
import CategoriesPage from './pages/Admin/CategoriesPage';
import HarvestsPage from './pages/Admin/HarvestsPage';
import OrdersPage from './pages/Admin/OrdersPage';
import ProductsPage from './pages/Admin/ProductsPage';
import ShippersPage from './pages/Admin/ShippersPage';
import AuctionsPage from './pages/Admin/AuctionsPage';
import AdminSettingsPage from './pages/Admin/SettingsPage';
import AdminHelpPage from './pages/Admin/HelpPage';

import { ROUTES } from './constants';

// ---------------- ProtectedRoute component ----------------
interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) return null // hoặc loader tùy mày

  return user && user.role === 'admin'
    ? <>{children}</>
    : <Navigate to={ROUTES.ADMIN_LOGIN} replace />
}


// ---------------- App ----------------
function App() {
  const { user } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Admin routes */}
        <Route path={ROUTES.ADMIN_DASHBOARD} element={
          <ProtectedRoute>
            <AdminLayout><AdminDashboardPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_USERS} element={
          <ProtectedRoute>
            <AdminLayout><UsersPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_APPROVAL} element={
          <ProtectedRoute>
            <AdminLayout><ApprovalPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_FARMS} element={
          <ProtectedRoute>
            <AdminLayout><FarmsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_CROPS} element={
          <ProtectedRoute>
            <AdminLayout><CropsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_CATEGORIES} element={
          <ProtectedRoute>
            <AdminLayout><CategoriesPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_HARVESTS} element={
          <ProtectedRoute>
            <AdminLayout><HarvestsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_ORDERS} element={
          <ProtectedRoute>
            <AdminLayout><OrdersPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_PRODUCTS} element={
          <ProtectedRoute>
            <AdminLayout><ProductsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path={ROUTES.ADMIN_SHIPPERS} element={
          <ProtectedRoute>
            <AdminLayout><ShippersPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/auctions" element={
          <ProtectedRoute>
            <AdminLayout><AuctionsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <AdminLayout><AdminSettingsPage /></AdminLayout>
          </ProtectedRoute>
        } />
        <Route path="/admin/help" element={
          <ProtectedRoute>
            <AdminLayout><AdminHelpPage /></AdminLayout>
          </ProtectedRoute>
        } />

        {/* Admin login */}
        <Route path={ROUTES.ADMIN_LOGIN} element={
          user && user.role === 'admin' 
            ? <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />
            : <AdminLoginPage />
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={ROUTES.ADMIN_LOGIN} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
