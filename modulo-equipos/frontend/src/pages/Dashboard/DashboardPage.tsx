import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getDashboardStats, type DashboardStats } from '../../api/dashboard.api'
import { getMovimientosRecientes, type Movimiento } from '../../api/movimientos.api'
import StatCard from '../../components/StatCard'
import { movimientoBadge } from '../../components/Badge'
import { TableSkeleton } from '../../components/LoadingSpinner'
import EmptyState from '../../components/EmptyState'
import { IcoUser, IcoArrows, IcoMonitor, IcoAlert, IcoClipboard, IcoDoor } from '../../components/Icons'
import { formatDate } from '../../utils/equipoUtils'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingMov, setLoadingMov] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([
        getDashboardStats(),
        getMovimientosRecientes(10),
      ])
      setStats(s)
      setMovimientos(m)
    } catch {
      toast.error('Error al cargar el dashboard')
    } finally {
      setLoadingStats(false)
      setLoadingMov(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
    const interval = setInterval(() => { void fetchData() }, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  return (
    <div>
      {/* Stats */}
      <div className="grid-cols-stats" style={{ marginBottom: 24 }}>
        <StatCard label="Personal dentro"     value={loadingStats ? '…' : (stats?.personasSistemaDentro ?? 0)} icon={<IcoUser size={22} />}    color="#2563eb" />
        <StatCard label="Visitantes dentro"  value={loadingStats ? '…' : (stats?.visitantesDentro ?? 0)}      icon={<IcoDoor size={22} />}  color="#0891b2" />
        <StatCard label="Entradas hoy"       value={loadingStats ? '…' : (stats?.entradasHoy ?? 0)}           icon={<IcoArrows size={22} />}  color="#16a34a" />
        <StatCard label="Salidas hoy"        value={loadingStats ? '…' : (stats?.salidasHoy ?? 0)}            icon={<IcoArrows size={22} />}  color="#d97706" />
        <StatCard label="Equipos activos"    value={loadingStats ? '…' : (stats?.equiposActivos ?? 0)}        icon={<IcoMonitor size={22} />} color="#7c3aed" />
        <StatCard label="Equipos reportados" value={loadingStats ? '…' : (stats?.equiposReportados ?? 0)}     icon={<IcoAlert size={22} />}   color="#dc2626" />
      </div>

      {/* Últimos movimientos */}
      <div className="card">
        <div className="card-header">
          <h2>Últimos movimientos</h2>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Actualización automática cada 30 s
          </span>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Persona</th>
                <th>Tipo</th>
                <th>Equipos</th>
                <th>Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {loadingMov ? (
                <TableSkeleton rows={6} cols={5} />
              ) : movimientos.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState icon={<IcoClipboard size={32} />} title="Sin movimientos" description="No hay movimientos registrados aún" />
                  </td>
                </tr>
              ) : (
                movimientos.map((m) => {
                  const nombre = m.persona
                    ? `${m.persona.nombre} ${m.persona.apellido}`
                    : m.visitante
                      ? `${m.visitante.nombre} ${m.visitante.apellido}`
                      : '—'
                  const registradoPor = m.registradoPorNombre
                    ?? (m.registradoPor ? `${m.registradoPor.nombre} ${m.registradoPor.apellido}` : '—')
                  return (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(m.fechaHora)}</td>
                      <td>{nombre}</td>
                      <td>{movimientoBadge(m.tipo)}</td>
                      <td>{m.equipos.length} equipo{m.equipos.length !== 1 ? 's' : ''}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{registradoPor}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
