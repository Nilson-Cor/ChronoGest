import { useState, useEffect, useMemo } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { createReporte, resolverReporte, type Reporte, type TipoReporte } from '../../api/reportes.api'
import { getEquipos, type Equipo } from '../../api/equipos.api'
import LoadingSpinner from '../../components/LoadingSpinner'

type ModalMode = 'create' | 'resolve'

interface ReporteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  mode: ModalMode
  reporte?: Reporte | null
}

function ownerLabel(eq: Equipo): string {
  if (eq.visitante) return `Visitante: ${eq.visitante.nombre} ${eq.visitante.apellido}`
  if (eq.persona) return `${eq.persona.nombre} ${eq.persona.apellido}`
  return 'Sin asignar'
}

export default function ReporteModal({ open, onClose, onSuccess, mode, reporte }: ReporteModalProps) {
  const [tipo, setTipo] = useState<TipoReporte>('DANO')
  const [descripcion, setDescripcion] = useState('')
  const [resolucion, setResolucion] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [equipoQuery, setEquipoQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [allEquipos, setAllEquipos] = useState<Equipo[]>([])
  const [loadingEquipos, setLoadingEquipos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load all equipos when modal opens for create mode
  useEffect(() => {
    if (open && mode === 'create') {
      setTipo('DANO')
      setDescripcion('')
      setEquipoId('')
      setEquipoQuery('')
      setErrors({})
      setShowDropdown(false)
      setLoadingEquipos(true)
      getEquipos()
        .then(setAllEquipos)
        .catch(() => toast.error('Error al cargar equipos'))
        .finally(() => setLoadingEquipos(false))
    }
    if (open && mode === 'resolve') {
      setResolucion('')
      setErrors({})
    }
  }, [open, mode])

  // Client-side filter by serial, marca, modelo, owner name/doc
  const equipoResults = useMemo(() => {
    const q = equipoQuery.trim().toLowerCase()
    if (!q || equipoId) return []
    return allEquipos.filter((eq) => {
      const equStr = `${eq.serial} ${eq.marca} ${eq.modelo}`.toLowerCase()
      const ownerStr = eq.visitante
        ? `${eq.visitante.nombre} ${eq.visitante.apellido} ${eq.visitante.documento}`.toLowerCase()
        : eq.persona
          ? `${eq.persona.nombre} ${eq.persona.apellido} ${eq.persona.cedula ?? ''} ${eq.persona.documento ?? ''}`.toLowerCase()
          : ''
      return equStr.includes(q) || ownerStr.includes(q)
    }).slice(0, 10)
  }, [allEquipos, equipoQuery, equipoId])

  function handleEquipoSearch(val: string) {
    setEquipoQuery(val)
    setEquipoId('')
    setShowDropdown(true)
  }

  function selectEquipo(eq: Equipo) {
    setEquipoId(eq.id)
    setEquipoQuery(`${eq.marca} ${eq.modelo} — ${eq.serial}`)
    setShowDropdown(false)
  }

  async function handleSave() {
    if (mode === 'create') {
      const errs: Record<string, string> = {}
      if (!equipoId) errs.equipo = 'Selecciona un equipo'
      if (!descripcion.trim()) errs.descripcion = 'Requerido'
      setErrors(errs)
      if (Object.keys(errs).length > 0) return
      setLoading(true)
      try {
        await createReporte({ tipo, descripcion: descripcion.trim(), equipoId })
        toast.success('Reporte creado')
        onSuccess()
        onClose()
      } catch {
        toast.error('Error al crear el reporte')
      } finally {
        setLoading(false)
      }
    } else if (reporte) {
      if (!resolucion.trim()) { setErrors({ resolucion: 'Describe la resolución' }); return }
      setLoading(true)
      try {
        await resolverReporte(reporte.id, { resolucion: resolucion.trim() })
        toast.success('Reporte marcado como resuelto')
        onSuccess()
        onClose()
      } catch {
        toast.error('Error al resolver el reporte')
      } finally {
        setLoading(false)
      }
    }
  }

  if (mode === 'resolve') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Marcar como resuelto"
        footer={
          <>
            <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
            <button className="btn btn-green" onClick={handleSave} disabled={loading}>
              {loading && <LoadingSpinner size={16} />}
              Marcar resuelto
            </button>
          </>
        }
      >
        <div>
          {reporte && (
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
              <div style={{ fontWeight: 600 }}>{reporte.equipo?.marca} {reporte.equipo?.modelo}</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{reporte.descripcion}</div>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Descripción de la resolución *</label>
            <textarea
              className="form-textarea"
              value={resolucion}
              onChange={(e) => setResolucion(e.target.value)}
              placeholder="¿Cómo se resolvió el problema?..."
              rows={4}
            />
            {errors.resolucion && <p className="form-error">{errors.resolucion}</p>}
          </div>
        </div>
      </Modal>
    )
  }

  // Selected equipo info
  const selectedEquipo = equipoId ? allEquipos.find((e) => e.id === equipoId) : null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nuevo reporte"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-red" onClick={handleSave} disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            Crear reporte
          </button>
        </>
      }
    >
      <div>
        {/* Equipo search */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label">Equipo *</label>
          {loadingEquipos ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              <LoadingSpinner size={14} /> Cargando equipos...
            </div>
          ) : (
            <>
              <input
                className="form-input"
                value={equipoQuery}
                onChange={(e) => handleEquipoSearch(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                placeholder="Buscar por serial, marca, nombre o documento del dueño..."
              />
              {errors.equipo && <p className="form-error">{errors.equipo}</p>}
              {showDropdown && equipoResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute', top: 'calc(100% - 4px)', left: 0, right: 0, zIndex: 20,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '0 0 10px 10px', boxShadow: 'var(--shadow-lg)',
                    maxHeight: 240, overflowY: 'auto',
                  }}
                >
                  {equipoResults.map((eq) => (
                    <button
                      key={eq.id}
                      onMouseDown={() => selectEquipo(eq)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                        width: '100%', padding: '10px 14px', border: 'none',
                        background: 'none', cursor: 'pointer', textAlign: 'left',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <strong style={{ fontSize: 13 }}>{eq.marca} {eq.modelo}</strong>
                        <code style={{ fontSize: 11, background: 'var(--surface2)', padding: '1px 5px', borderRadius: 4 }}>{eq.serial}</code>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{ownerLabel(eq)}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Selected equipo info card */}
          {selectedEquipo && (
            <div style={{
              marginTop: 8, padding: '10px 14px', background: 'var(--surface2)',
              borderRadius: 8, border: '1px solid var(--border)', fontSize: 13,
            }}>
              <div style={{ fontWeight: 600 }}>{selectedEquipo.marca} {selectedEquipo.modelo}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                Serial: {selectedEquipo.serial} · {ownerLabel(selectedEquipo)}
              </div>
            </div>
          )}
        </div>

        {/* Tipo */}
        <div className="form-group">
          <label className="form-label">Tipo de incidente</label>
          <select className="form-select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoReporte)}>
            <option value="DANO">Daño</option>
            <option value="PERDIDA">Pérdida</option>
            <option value="ROBO">Robo</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>

        {/* Descripción */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Descripción *</label>
          <textarea
            className="form-textarea"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el incidente con el equipo..."
            rows={4}
          />
          {errors.descripcion && <p className="form-error">{errors.descripcion}</p>}
        </div>
      </div>
    </Modal>
  )
}
