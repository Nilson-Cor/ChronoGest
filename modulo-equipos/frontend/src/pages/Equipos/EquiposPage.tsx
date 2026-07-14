import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getEquipos, deleteEquipo, type Equipo, type TipoEquipo, type EstadoEquipo } from '../../api/equipos.api'
import { estadoEquipoBadge } from '../../components/Badge'
import { tipoEquipoLabel, TIPO_EQUIPO_OPTIONS } from '../../utils/equipoUtils'
import { TipoEquipoIcon, IcoPlus, IcoEdit, IcoTrash, IcoSearch, IcoMonitor } from '../../components/Icons'
import EmptyState from '../../components/EmptyState'
import { TableSkeleton } from '../../components/LoadingSpinner'
import EquipoModal from './EquipoModal'

interface OwnerGroup {
  key: string
  label: string
  sublabel?: string
  isVisitante: boolean
  equipos: Equipo[]
}

function buildGroups(equipos: Equipo[]): OwnerGroup[] {
  const map = new Map<string, OwnerGroup>()

  for (const eq of equipos) {
    if (eq.visitante) {
      const key = `v_${eq.visitante.id}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: `${eq.visitante.nombre} ${eq.visitante.apellido}`,
          sublabel: `Visitante · Doc: ${eq.visitante.documento}`,
          isVisitante: true,
          equipos: [],
        })
      }
      map.get(key)!.equipos.push(eq)
    } else if (eq.persona) {
      const key = `p_${eq.persona.idPersona ?? eq.persona.id ?? eq.personaId}`
      if (!map.has(key)) {
        const doc = eq.persona.cedula ?? eq.persona.documento
        map.set(key, {
          key,
          label: `${eq.persona.nombre} ${eq.persona.apellido}`,
          sublabel: doc ? `Doc: ${doc}` : undefined,
          isVisitante: false,
          equipos: [],
        })
      }
      map.get(key)!.equipos.push(eq)
    } else {
      const key = 'sin_asignar'
      if (!map.has(key)) {
        map.set(key, { key, label: 'Sin asignar', isVisitante: false, equipos: [] })
      }
      map.get(key)!.equipos.push(eq)
    }
  }

  return Array.from(map.values())
}

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState<TipoEquipo | ''>('')
  const [filterEstado, setFilterEstado] = useState<EstadoEquipo | ''>('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Equipo | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set())

  const fetchEquipos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEquipos({
        tipo: filterTipo || undefined,
        estado: filterEstado || undefined,
      })
      setEquipos(data)
    } catch {
      toast.error('Error al cargar equipos')
    } finally {
      setLoading(false)
    }
  }, [filterTipo, filterEstado])

  useEffect(() => { void fetchEquipos() }, [fetchEquipos])

  // Client-side search by person name/doc OR serial/marca/modelo
  const filtered = useMemo(() => {
    if (!search.trim()) return equipos
    const q = search.trim().toLowerCase()
    return equipos.filter((eq) => {
      const personaStr = eq.persona
        ? `${eq.persona.nombre} ${eq.persona.apellido} ${eq.persona.cedula ?? ''} ${eq.persona.documento ?? ''}`.toLowerCase()
        : ''
      const visitanteStr = eq.visitante
        ? `${eq.visitante.nombre} ${eq.visitante.apellido} ${eq.visitante.documento}`.toLowerCase()
        : ''
      const equipoStr = `${eq.serial} ${eq.marca} ${eq.modelo}`.toLowerCase()
      return personaStr.includes(q) || visitanteStr.includes(q) || equipoStr.includes(q)
    })
  }, [equipos, search])

  const groups = useMemo(() => buildGroups(filtered), [filtered])

  function toggleGroup(key: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function openCreate() { setEditing(null); setShowModal(true) }
  function openEdit(eq: Equipo) { setEditing(eq); setShowModal(true) }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este equipo? Esta acción no se puede deshacer.')) return
    setDeletingId(id)
    try {
      await deleteEquipo(id)
      toast.success('Equipo eliminado')
      void fetchEquipos()
    } catch {
      toast.error('Error al eliminar el equipo')
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
            placeholder="Buscar por nombre, documento o serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value as TipoEquipo | '')}>
          <option value="">Todos los tipos</option>
          {TIPO_EQUIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select className="form-select" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoEquipo | '')}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="reportado">Reportado</option>
          <option value="dado_de_baja">Dado de baja</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-navy" onClick={openCreate}>
          <IcoPlus size={16} />
          Registrar equipo
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="table-wrapper">
            <table>
              <tbody><TableSkeleton rows={6} cols={5} /></tbody>
            </table>
          </div>
        ) : groups.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              icon={<IcoMonitor size={32} />}
              title="Sin equipos"
              description="No hay equipos que coincidan con los filtros"
              action={<button className="btn btn-navy" onClick={openCreate}>Registrar primero</button>}
            />
          </div>
        ) : (
          <div>
            {groups.map((group) => {
              const isOpen = openGroups.has(group.key)
              const totalDentro = group.equipos.filter((e) => e.dentroDelCentro).length
              return (
                <div key={group.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  {/* Group header — clickable row */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '14px 20px',
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: group.isVisitante ? 'var(--yellow)' : 'var(--navy)',
                      color: '#fff', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {group.label.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                    </div>
                    {/* Name + sublabel */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>
                        {group.isVisitante && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--yellow)', marginRight: 6, textTransform: 'uppercase' }}>
                            Visitante
                          </span>
                        )}
                        {group.label}
                      </div>
                      {group.sublabel && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{group.sublabel}</div>
                      )}
                    </div>
                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 20,
                        background: 'var(--surface2)', color: 'var(--text-muted)',
                      }}>
                        {group.equipos.length} equipo{group.equipos.length !== 1 ? 's' : ''}
                      </span>
                      {totalDentro > 0 && (
                        <span style={{
                          fontSize: 12, padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(22,163,74,.12)', color: 'var(--green)',
                        }}>
                          {totalDentro} dentro
                        </span>
                      )}
                      <span style={{
                        fontSize: 18, color: 'var(--text-muted)',
                        transform: isOpen ? 'rotate(90deg)' : 'none',
                        transition: 'transform .15s',
                        display: 'inline-block',
                      }}>›</span>
                    </div>
                  </button>

                  {/* Expanded equipo list */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <table style={{ margin: 0 }}>
                        <thead>
                          <tr style={{ background: 'var(--surface2)' }}>
                            <th style={{ paddingLeft: 52 }}>Tipo</th>
                            <th>Serial</th>
                            <th>Marca / Modelo</th>
                            <th>Estado equipo</th>
                            <th>Ubicación</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.equipos.map((eq) => (
                            <tr key={eq.id}>
                              <td style={{ paddingLeft: 52 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <TipoEquipoIcon tipo={eq.tipo} size={17} />
                                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {tipoEquipoLabel(eq.tipo)}
                                  </span>
                                </div>
                              </td>
                              <td>
                                <code style={{ fontSize: 12, background: 'var(--surface2)', padding: '2px 6px', borderRadius: 4 }}>
                                  {eq.serial}
                                </code>
                              </td>
                              <td>
                                <strong>{eq.marca}</strong>
                                <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{eq.modelo}</span>
                              </td>
                              <td>{estadoEquipoBadge(eq.estado)}</td>
                              <td>
                                <span style={{
                                  fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                                  background: eq.dentroDelCentro ? 'rgba(22,163,74,.12)' : 'rgba(148,163,184,.12)',
                                  color: eq.dentroDelCentro ? 'var(--green)' : 'var(--text-muted)',
                                }}>
                                  {eq.dentroDelCentro ? 'Dentro del centro' : 'Fuera del centro'}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(eq)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <IcoEdit size={14} /> Editar
                                  </button>
                                  <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleDelete(eq.id)}
                                    disabled={deletingId === eq.id}
                                    style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <IcoTrash size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <EquipoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={fetchEquipos}
        equipo={editing}
      />
    </div>
  )
}
