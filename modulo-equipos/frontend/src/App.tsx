import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/Login/LoginPage'
import DashboardPage from './pages/Dashboard/DashboardPage'
import PorteriaPage from './pages/Porteria/PorteriaPage'
import EquiposPage from './pages/Equipos/EquiposPage'
import MovimientosPage from './pages/Movimientos/MovimientosPage'
import VisitantesPage from './pages/Visitantes/VisitantesPage'
import ReportesPage from './pages/Reportes/ReportesPage'
import { useEffect } from 'react'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function ThemeInit() {
  useEffect(() => {
    const saved = localStorage.getItem('theme') ?? 'light'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])
  return null
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeInit />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: 13.5,
            borderRadius: 10,
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#fff' },
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/porteria" element={<PorteriaPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/movimientos" element={<MovimientosPage />} />
            <Route path="/visitantes" element={<VisitantesPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
