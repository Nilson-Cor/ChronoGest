import { useState, useEffect, useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import { getMovimientos, type Movimiento, type TipoPersonaMovimiento } from '../../api/movimientos.api'
import EmptyState from '../../components/EmptyState'
import { TableSkeleton } from '../../components/LoadingSpinner'
import { formatDate, tipoEquipoLabel } from '../../utils/equipoUtils'
import { TipoEquipoIcon, IcoClipboard, IcoChevronDown, IcoChevronUp, IcoSearch } from '../../components/Icons'

// ── Tipos internos ────────────────────────────────────────────────────────────

interface Session {
  key: string            // ownerKey + índice de sesión
  ownerKey: string       // personaId | visitanteId | 'anon_<movId>'
  nombre: string
  documento: string      // cédula o documento para búsqueda
  tipoPersona: string    // 'Personal' | 'Visitante'
  isVisitante: boolean
  entrada: Movimiento | null
  salida: Movimiento | null
  firstTime: number      // epoch ms para ordenar
}

function ownerKey(m: Movimiento): string {
  if (m.personaId) return `p_${m.personaId}`
  if (m.visitanteId) return `v_${m.visitanteId}`
  return `anon_${m.id}`
}

function ownerNombre(m: Movimiento): string {
  if (m.persona) return `${m.persona.nombre} ${m.persona.apellido}`
  if (m.visitante) return `${m.visitante.nombre} ${m.visitante.apellido}`
  return '—'
}

function ownerDocumento(m: Movimiento): string {
  if (m.persona) return String(m.persona.cedula ?? m.persona.documento ?? '')
  if (m.visitante) return String(m.visitante.documento ?? '')
  return ''
}

/** Toma todos los movimientos y construye sesiones (entrada + salida pareadas) */
function buildSessions(movimientos: Movimiento[]): Session[] {
  // Agrupar por dueño
  const byOwner = new Map<string, Movimiento[]>()
  for (const m of movimientos) {
    const k = ownerKey(m)
    if (!byOwner.has(k)) byOwner.set(k, [])
    byOwner.get(k)!.push(m)
  }

  const sessions: Session[] = []

  for (const [ok, movs] of byOwner) {
    // Ordenar ASC para parear correctamente
    const sorted = [...movs].sort(
      (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime(),
    )

    const nombre = ownerNombre(sorted[0])
    const documento = ownerDocumento(sorted[0])
    const isVisitante = sorted[0].tipoPersona === 'EXTERNO'
    const tipoPersona = isVisitante ? 'Visitante' : 'Personal'

    // Parear ENTRADA → SALIDA secuencialmente
    let openEntrada: Movimiento | null = null
    let sessionIdx = 0

    for (const m of sorted) {
      if (m.tipo === 'ENTRADA') {
        // Si había una entrada sin salida, cerrarla primero como sesión sin salida
        if (openEntrada) {
          sessions.push({
            key: `${ok}_${sessionIdx++}`,
            ownerKey: ok,
            nombre,
            documento,
            tipoPersona,
            isVisitante,
            entrada: openEntrada,
            salida: null,
            firstTime: new Date(openEntrada.fechaHora).getTime(),
          })
        }
        openEntrada = m
      } else if (m.tipo === 'SALIDA') {
        sessions.push({
          key: `${ok}_${sessionIdx++}`,
          ownerKey: ok,
          nombre,
          documento,
          tipoPersona,
          isVisitante,
          entrada: openEntrada,
          salida: m,
          firstTime: openEntrada
            ? new Date(openEntrada.fechaHora).getTime()
            : new Date(m.fechaHora).getTime(),
        })
        openEntrada = null
      }
    }

    // Entrada sin salida todavía
    if (openEntrada) {
      sessions.push({
        key: `${ok}_${sessionIdx}`,
        ownerKey: ok,
        nombre,
        documento,
        tipoPersona,
        isVisitante,
        entrada: openEntrada,
        salida: null,
        firstTime: new Date(openEntrada.fechaHora).getTime(),
      })
    }
  }

  // Ordenar por hora de primera actividad (entrada más antigua primero)
  sessions.sort((a, b) => a.firstTime - b.firstTime)
  return sessions
}

function duracion(entrada: Movimiento, salida: Movimiento): string {
  const ms = new Date(salida.fechaHora).getTime() - new Date(entrada.fechaHora).getTime()
  if (ms < 0) return '—'
  const mins = Math.floor(ms / 60000)
  const horas = Math.floor(mins / 60)
  const resto = mins % 60
  if (horas === 0) return `${mins} min`
  return `${horas}h ${resto}min`
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipoPersona, setFilterTipoPersona] = useState<TipoPersonaMovimiento | ''>('')
  const [filterDesde, setFilterDesde] = useState('')
  const [filterHasta, setFilterHasta] = useState('')
  const [filterEstado, setFilterEstado] = useState<'todos' | 'dentro' | 'fuera'>('todos')
  const [search, setSearch] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const fetchMovimientos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getMovimientos({
        tipoPersona: filterTipoPersona || undefined,
        desde: filterDesde || undefined,
        hasta: filterHasta || undefined,
      })
      setMovimientos(data)
    } catch {
      toast.error('Error al cargar movimientos')
    } finally {
      setLoading(false)
    }
  }, [filterTipoPersona, filterDesde, filterHasta])

  useEffect(() => { void fetchMovimientos() }, [fetchMovimientos])

  const sessions = useMemo(() => {
    let s = buildSessions(movimientos)
    if (filterEstado === 'dentro') s = s.filter((x) => x.entrada && !x.salida)
    if (filterEstado === 'fuera') s = s.filter((x) => x.salida !== null)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      s = s.filter((x) =>
        x.nombre.toLowerCase().includes(q) || x.documento.includes(q),
      )
    }
    return s
  }, [movimientos, filterEstado, search])

  const limpiar = filterTipoPersona || filterDesde || filterHasta || filterEstado !== 'todos' || search

  return (
    <div>
      <div className="filters-bar">
        <div style={{ position: 'relative', minWidth: 220 }}>
          <IcoSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 32 }}
            placeholder="Buscar por nombre o documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value as 'todos' | 'dentro' | 'fuera')}
        >
          <option value="todos">Todos los estados</option>
          <option value="dentro">Solo activos (dentro)</option>
          <option value="fuera">Solo completados (salieron)</option>
        </select>
        <select
          className="form-select"
          value={filterTipoPersona}
          onChange={(e) => setFilterTipoPersona(e.target.value as TipoPersonaMovimiento | '')}
        >
          <option value="">Personal y Visitantes</option>
          <option value="SISTEMA">Personal del sistema</option>
          <option value="EXTERNO">Visitantes externos</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Desde:</label>
          <input type="date" className="form-input" style={{ width: 150 }} value={filterDesde} onChange={(e) => setFilterDesde(e.target.value)} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Hasta:</label>
          <input type="date" className="form-input" style={{ width: 150 }} value={filterHasta} onChange={(e) => setFilterHasta(e.target.value)} />
        </div>
        {limpiar && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setFilterTipoPersona('')
              setFilterDesde('')
              setFilterHasta('')
              setFilterEstado('todos')
              setSearch('')
            }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Tipo</th>
                <th>↓ Entrada</th>
                <th>↑ Salida</th>
                <th>Tiempo dentro</th>
                <th>Equipos</th>
                <th>Registrado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton rows={8} cols={8} />
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<IcoClipboard size={32} />}
                      title="Sin movimientos"
                      description="No hay movimientos para los filtros aplicados"
                    />
                  </td>
                </tr>
              ) : (
                sessions.flatMap((s) => {
                  const equiposTotales =
                    (s.entrada?.equipos.length ?? 0) + (s.salida?.equipos.length ?? 0)
                  const registradoPor =
                    s.entrada?.registradoPorNombre ??
                    s.salida?.registradoPorNombre ??
                    '—'

                  const isExpanded = expandedKey === s.key

                  const rows = [
                    <tr
                      key={s.key}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpandedKey(isExpanded ? null : s.key)}
                    >
                      {/* Persona */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: s.isVisitante ? 'var(--yellow)' : 'var(--navy)',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: 11, fontWeight: 700,
                          }}>
                            {s.nombre.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{s.nombre}</span>
                        </div>
                      </td>

                      {/* Tipo persona */}
                      <td>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.tipoPersona}</span>
                      </td>

                      {/* Entrada */}
                      <td>
                        {s.entrada ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap' }}>
                            {formatDate(s.entrada.fechaHora)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Salida */}
                      <td>
                        {s.salida ? (
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {formatDate(s.salida.fechaHora)}
                          </span>
                        ) : s.entrada ? (
                          <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 20,
                            background: 'var(--surface2)', color: 'var(--text-muted)', fontWeight: 600,
                          }}>
                            Dentro
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Duración */}
                      <td>
                        {s.entrada && s.salida ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {duracion(s.entrada, s.salida)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>

                      {/* Equipos */}
                      <td>
                        <span style={{ fontWeight: 600 }}>{equiposTotales}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 4 }}>
                          equipo{equiposTotales !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Registrado por */}
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{registradoPor}</td>

                      {/* Expand icon */}
                      <td>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {isExpanded ? <IcoChevronUp size={14} /> : <IcoChevronDown size={14} />}
                        </span>
                      </td>
                    </tr>,
                  ]

                  // Fila expandida con equipos
                  if (isExpanded) {
                    rows.push(
                      <tr key={`${s.key}-detail`} className="expanded-row">
                        <td colSpan={8}>
                          <div style={{ padding: '8px 0', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            {/* Equipos de entrada */}
                            {s.entrada && s.entrada.equipos.length > 0 && (
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  Equipos en entrada
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {s.entrada.equipos.map((me) => (
                                    <EquipoChip key={me.equipoId} me={me} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Equipos de salida */}
                            {s.salida && s.salida.equipos.length > 0 && (
                              <div>
                                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>
                                  Equipos en salida
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  {s.salida.equipos.map((me) => (
                                    <EquipoChip key={me.equipoId} me={me} />
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* Observaciones */}
                            {(s.entrada?.observaciones || s.salida?.observaciones) && (
                              <div>
                                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                  Observaciones
                                </p>
                                {s.entrada?.observaciones && (
                                  <p style={{ margin: '0 0 2px', fontSize: 12 }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Entrada:</span> {s.entrada.observaciones}
                                  </p>
                                )}
                                {s.salida?.observaciones && (
                                  <p style={{ margin: 0, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text)' }}>Salida:</span> {s.salida.observaciones}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>,
                    )
                  }

                  return rows
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function EquipoChip({ me }: { me: { equipoId: string; equipo?: { tipo: string; marca: string; modelo: string; serial: string } | null } }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '7px 12px', fontSize: 13,
    }}>
      <TipoEquipoIcon tipo={me.equipo?.tipo ?? 'otro'} size={15} />
      <div>
        <div style={{ fontWeight: 600 }}>
          {me.equipo ? `${me.equipo.marca} ${me.equipo.modelo}` : me.equipoId}
        </div>
        {me.equipo && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {tipoEquipoLabel(me.equipo.tipo)} · {me.equipo.serial}
          </div>
        )}
      </div>
    </div>
  )
}
