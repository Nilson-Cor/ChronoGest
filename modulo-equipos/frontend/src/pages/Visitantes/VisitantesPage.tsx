import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { getVisitantes, deleteVisitante, type Visitante } from '../../api/visitantes.api'
import { getEquipos, type Equipo } from '../../api/equipos.api'
import EmptyState from '../../components/EmptyState'
import { TableSkeleton } from '../../components/LoadingSpinner'
import { IcoUser, IcoEdit, IcoTrash, IcoPlus, IcoArrows, IcoSearch } from '../../components/Icons'
import VisitanteModal from './VisitanteModal'
import MovimientoModal from '../Porteria/MovimientoModal'

export default function VisitantesPage() {
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Visitante | null>(null)
  const [movimientoVisitante, setMovimientoVisitante] = useState<Visitante | null>(null)
  const [visitanteEquipos, setVisitanteEquipos] = useState<Equipo[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchVisitantes = useCallback(async (q?: string) => {
    setLoading(true)
    try {
      const data = await getVisitantes(q || undefined)
      setVisitantes(data)
    } catch {
      toast.error('Error al cargar visitantes')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearch(val: string) {
    setSearch(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchVisitantes(val.trim()), 400)
  }

  useEffect(() => { void fetchVisitantes() }, [fetchVisitantes])


  async function openMovimiento(v: Visitante) {
    setMovimientoVisitante(v)
    try {
      const eqs = await getEquipos({ visitanteId: v.id })
      setVisitanteEquipos(eqs)
    } catch {
      setVisitanteEquipos([])
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este visitante?')) return
    setDeletingId(id)
    try {
      await deleteVisitante(id)
      toast.success('Visitante eliminado')
      void fetchVisitantes()
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div>
      <div className="filters-bar">
        <div style={{ position: 'relative', minWidth: 260 }}>
          <IcoSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por nombre, documento o empresa..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn-navy" onClick={() => { setEditing(null); setShowModal(true) }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Registrar visitante
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Empresa</th>
                <th>Teléfono</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={5} cols={6} />
              ) : visitantes.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<IcoUser size={32} />}
                      title="Sin visitantes"
                      description="Registra el primer visitante"
                      action={<button className="btn btn-navy" onClick={() => { setEditing(null); setShowModal(true) }}>Registrar visitante</button>}
                    />
                  </td>
                </tr>
              ) : (
                visitantes.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginRight: 4 }}>{v.tipoDocumento}</span>
                      <strong>{v.documento}</strong>
                    </td>
                    <td style={{ fontWeight: 600 }}>{v.nombre} {v.apellido}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.empresa ?? '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{v.telefono ?? '—'}</td>
                    <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: 12 }}>
                      {v.motivoVisita ?? '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-green btn-sm" onClick={() => openMovimiento(v)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IcoArrows size={13} /> Movimiento
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(v); setShowModal(true) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <IcoEdit size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(v.id)}
                          disabled={deletingId === v.id}
                          style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <IcoTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VisitanteModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchVisitantes}
        visitante={editing}
      />

      <MovimientoModal
        open={!!movimientoVisitante}
        onClose={() => setMovimientoVisitante(null)}
        onSuccess={() => { setMovimientoVisitante(null) }}
        persona={null}
        visitanteId={movimientoVisitante?.id}
        visitanteNombre={movimientoVisitante ? `${movimientoVisitante.nombre} ${movimientoVisitante.apellido}` : undefined}
        equipos={visitanteEquipos}
      />
    </div>
  )
}
