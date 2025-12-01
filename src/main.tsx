import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './styles/responsive.css'
import './styles/global-responsive.css'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'

// Setup React Query Client với auto-refresh mặc định
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Tự động refetch khi focus lại tab
      refetchOnReconnect: true, // Tự động refetch khi reconnect
      staleTime: 30 * 1000, // Data được coi là "stale" sau 30 giây
      gcTime: 5 * 60 * 1000, // Cache time 5 phút
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)

