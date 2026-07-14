import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getReportes, type Reporte, type TipoReporte, type EstadoReporte } from '../../api/reportes.api'
import { reporteEstadoBadge, reporteTipoBadge } from '../../components/Badge'
import EmptyState from '../../components/EmptyState'
import { TableSkeleton } from '../../components/LoadingSpinner'
import ReporteModal from './ReporteModal'
import { formatDate } from '../../utils/equipoUtils'
import { TipoEquipoIcon, IcoClipboard } from '../../components/Icons'

export default function ReportesPage() {
  const [reportes, setReportes] = useState<Reporte[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<TipoReporte | ''>('')
  const [filterEstado, setFilterEstado] = useState<EstadoReporte | ''>('')
  const [showCreate, setShowCreate] = useState(false)
  const [resolving, setResolving] = useState<Reporte | null>(null)

  const fetchReportes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getReportes({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
      })
      setReportes(data)
    } catch {
      toast.error('Error al cargar reportes')
    } finally {
      setLoading(false)
    }
  }, [filterTipo, filterEstado])

  useEffect(() => { void fetchReportes() }, [fetchReportes])

  return (
    <div>
      <div className="filters-bar">
        <select className="form-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as TipoReporte | '')}>
          <option value="">Todos los tipos</option>
          <option value="DANO">Daño</option>
          <option value="PERDIDA">Pérdida</option>
          <option value="ROBO">Robo</option>
          <option value="OTRO">Otro</option>
        </select>
        <select className="form-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoReporte | '')}>
          <option value="">Activos y Resueltos</option>
          <option value="ACTIVO">Solo activos</option>
          <option value="RESUELTO">Solo resueltos</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-red" onClick={() => setShowCreate(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Nuevo reporte
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Equipo</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Reportado por</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={7} />
              ) : reportes.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={<IcoClipboard size={32} />}
                      title="Sin reportes"
                      description="No hay reportes activos. ¡Todo bien!"
                    />
                  </td>
                </tr>
              ) : (
                reportes.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.equipo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TipoEquipoIcon tipo={r.equipo.tipo} size={18} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {r.equipo.marca} {r.equipo.modelo}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {r.equipo.serial}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>{reporteTipoBadge(r.tipo)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>
                      {r.descripcion}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {r.reportadoPor ? `${r.reportadoPor.nombre} ${r.reportadoPor.apellido}` : '—'}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{formatDate(r.fechaReporte)}</td>
                    <td>{reporteEstadoBadge(r.estado)}</td>
                    <td>
                      {r.estado === 'ACTIVO' && (
                        <button
                          className="btn btn-green btn-sm"
                          onClick={() => setResolving(r)}
                        >
                          Resolver
                        </button>
                      )}
                      {r.estado === 'RESUELTO' && r.resolucion && (
                        <span
                          style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'help' }}
                          title={r.resolucion}
                        >
                          Ver resolución
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReporteModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={fetchReportes}
        mode="create"
      />

      <ReporteModal
        open={!!resolving}
        onClose={() => setResolving(null)}
        onSuccess={fetchReportes}
        mode="resolve"
        reporte={resolving}
      />
    </div>
  )
}
