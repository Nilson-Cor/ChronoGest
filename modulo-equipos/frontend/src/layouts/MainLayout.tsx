import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/porteria': 'Portería — Control de Acceso',
  '/equipos': 'Equipos',
  '/movimientos': 'Movimientos',
  '/visitantes': 'Visitantes',
  '/reportes': 'Reportes',
}

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  })
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

  const title = PAGE_TITLES[location.pathname] ?? 'Gestión de Equipos'

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <div className={`main-content${collapsed ? ' sidebar-collapsed' : ''}`}>
        <Header title={title} />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
