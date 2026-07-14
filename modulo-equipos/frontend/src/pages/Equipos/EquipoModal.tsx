import { useState, useEffect, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { createEquipo, updateEquipo, type Equipo, type TipoEquipo, type EstadoEquipo } from '../../api/equipos.api'
import { getTodasPersonas, type Persona } from '../../api/personas.api'
import { TIPO_EQUIPO_OPTIONS } from '../../utils/equipoUtils'
import { TipoEquipoIcon } from '../../components/Icons'
import LoadingSpinner from '../../components/LoadingSpinner'

interface EquipoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  equipo?: Equipo | null
}

interface FormState {
  serial: string
  tipo: TipoEquipo
  marca: string
  modelo: string
  descripcion: string
  estado: EstadoEquipo
  personaId: string
}

const INITIAL: FormState = {
  serial: '', tipo: 'portatil', marca: '', modelo: '',
  descripcion: '', estado: 'activo', personaId: '',
}

export default function EquipoModal({ open, onClose, onSuccess, equipo }: EquipoModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [loading, setLoading] = useState(false)

  // Personas selector state
  const [personas, setPersonas] = useState<Persona[]>([])
  const [loadingPersonas, setLoadingPersonas] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // El sistema principal usa idPersona como PK
  function personaId(p: Persona): string {
    return p.idPersona ?? p.id
  }
  function personaDoc(p: Persona): string {
    return String(p.cedula ?? p.documento ?? '—')
  }

  // Persona seleccionada (para mostrar su nombre)
  const personaSeleccionada = useMemo(
    () => personas.find((p) => personaId(p) === form.personaId) ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personas, form.personaId]
  )

  // Personas filtradas por el texto de búsqueda
  const personasFiltradas = useMemo(() => {
    const q = filtro.toLowerCase().trim()
    if (!q) return personas
    return personas.filter(
      (p) =>
        `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
        String(p.cedula ?? p.documento ?? '').includes(q)
    )
  }, [personas, filtro])

  // Cargar todas las personas al abrir el modal
  useEffect(() => {
    if (!open) return
    setLoadingPersonas(true)
    getTodasPersonas()
      .then(setPersonas)
      .catch(() => toast.error('No se pudieron cargar las personas'))
      .finally(() => setLoadingPersonas(false))
  }, [open])

  // Inicializar form
  useEffect(() => {
    if (open) {
      setForm(equipo
        ? { serial: equipo.serial, tipo: equipo.tipo, marca: equipo.marca, modelo: equipo.modelo,
            descripcion: equipo.descripcion ?? '', estado: equipo.estado, personaId: equipo.personaId ?? '' }
        : INITIAL
      )
      setErrors({})
      setFiltro('')
      setDropdownOpen(false)
    }
  }, [open, equipo])

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function selectPersona(p: Persona) {
    set('personaId', personaId(p))
    setFiltro('')
    setDropdownOpen(false)
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!form.personaId) errs.personaId = 'Debe seleccionar una persona'
    if (!form.serial.trim()) errs.serial = 'Requerido'
    if (!form.marca.trim()) errs.marca = 'Requerido'
    if (!form.modelo.trim()) errs.modelo = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      const dto = {
        serial: form.serial.trim(),
        tipo: form.tipo,
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        descripcion: form.descripcion.trim() || undefined,
        personaId: form.personaId,
        ...(equipo ? { estado: form.estado } : {}),
      }
      if (equipo) {
        await updateEquipo(equipo.id, dto)
        toast.success('Equipo actualizado')
      } else {
        await createEquipo(dto)
        toast.success('Equipo registrado')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Error al guardar el equipo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={equipo ? 'Editar equipo' : 'Registrar equipo'}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-navy" onClick={handleSave} disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            {equipo ? 'Guardar cambios' : 'Registrar'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>

        {/* Persona asignada — selector con buscador (REQUERIDO) */}
        <div className="form-group" style={{ gridColumn: 'span 2', position: 'relative' }} ref={dropdownRef}>
          <label className="form-label">Persona asignada *</label>

          {/* Botón que abre el dropdown */}
          <button
            type="button"
            onClick={() => { setDropdownOpen((v) => !v); setFiltro('') }}
            style={{
              width: '100%', padding: '9px 14px', border: `1px solid ${errors.personaId ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)',
              textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', fontSize: 14, gap: 8,
            }}
          >
            {loadingPersonas ? (
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <LoadingSpinner size={14} /> Cargando personas...
              </span>
            ) : personaSeleccionada ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: '50%', background: 'var(--navy)',
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {personaSeleccionada.nombre[0]}{personaSeleccionada.apellido?.[0] ?? ''}
                </span>
                <span>
                  <strong>{personaSeleccionada.nombre} {personaSeleccionada.apellido}</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 12 }}>
                    Doc: {personaDoc(personaSeleccionada)}
                  </span>
                </span>
              </span>
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Seleccionar persona...</span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform .2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {errors.personaId && <p className="form-error">{errors.personaId}</p>}

          {/* Dropdown */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '0 0 10px 10px', boxShadow: 'var(--shadow-lg)',
              marginTop: -1,
            }}>
              {/* Buscador interno del dropdown */}
              <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                <input
                  autoFocus
                  className="form-input"
                  style={{ margin: 0, fontSize: 13 }}
                  placeholder="Buscar por nombre o documento..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>

              {/* Lista de personas */}
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {personasFiltradas.length === 0 ? (
                  <div style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                    {filtro ? 'Sin resultados' : 'No hay personas registradas'}
                  </div>
                ) : (
                  personasFiltradas.map((p) => (
                    <button
                      key={personaId(p)}
                      type="button"
                      onClick={() => selectPersona(p)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        width: '100%', padding: '9px 14px', border: 'none',
                        background: form.personaId === personaId(p) ? 'var(--surface2)' : 'none',
                        cursor: 'pointer', textAlign: 'left',
                        borderBottom: '1px solid var(--border)',
                      }}
                      onMouseEnter={(e) => { if (form.personaId !== p.id) e.currentTarget.style.background = 'var(--surface2)' }}
                      onMouseLeave={(e) => { if (form.personaId !== p.id) e.currentTarget.style.background = 'none' }}
                    >
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%',
                        background: form.personaId === personaId(p) ? 'var(--blue)' : 'var(--navy)',
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {p.nombre[0]}{p.apellido?.[0] ?? ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                          {p.nombre} {p.apellido}
                          {form.personaId === personaId(p) && (
                            <span style={{ marginLeft: 6, color: 'var(--blue)', fontSize: 11 }}>✓ Seleccionado</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Doc: {personaDoc(p)}
                          {p.cargo && <span> · {p.cargo}</span>}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {personasFiltradas.length > 0 && (
                <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
                  {personasFiltradas.length} persona{personasFiltradas.length !== 1 ? 's' : ''} encontrada{personasFiltradas.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Serial */}
        <div className="form-group">
          <label className="form-label">Serial *</label>
          <input className="form-input" value={form.serial} onChange={(e) => set('serial', e.target.value)}
            placeholder="Ej: SN-2024-001" style={{ borderColor: errors.serial ? 'var(--red)' : undefined }} />
          {errors.serial && <p className="form-error">{errors.serial}</p>}
        </div>

        {/* Tipo */}
        <div className="form-group">
          <label className="form-label">Tipo *</label>
          <select className="form-select" value={form.tipo} onChange={(e) => set('tipo', e.target.value as TipoEquipo)}>
            {TIPO_EQUIPO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Marca */}
        <div className="form-group">
          <label className="form-label">Marca *</label>
          <input className="form-input" value={form.marca} onChange={(e) => set('marca', e.target.value)}
            placeholder="Ej: Dell, HP, Lenovo" style={{ borderColor: errors.marca ? 'var(--red)' : undefined }} />
          {errors.marca && <p className="form-error">{errors.marca}</p>}
        </div>

        {/* Modelo */}
        <div className="form-group">
          <label className="form-label">Modelo *</label>
          <input className="form-input" value={form.modelo} onChange={(e) => set('modelo', e.target.value)}
            placeholder="Ej: Latitude 5420" style={{ borderColor: errors.modelo ? 'var(--red)' : undefined }} />
          {errors.modelo && <p className="form-error">{errors.modelo}</p>}
        </div>

        {/* Estado (solo en edición) */}
        {equipo && (
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-select" value={form.estado} onChange={(e) => set('estado', e.target.value as EstadoEquipo)}>
              <option value="activo">Activo</option>
              <option value="reportado">Reportado</option>
              <option value="dado_de_baja">Dado de baja</option>
            </select>
          </div>
        )}

        {/* Descripción */}
        <div className="form-group" style={{ gridColumn: 'span 2', marginBottom: 0 }}>
          <label className="form-label">Descripción / Notas</label>
          <textarea className="form-textarea" value={form.descripcion}
            onChange={(e) => set('descripcion', e.target.value)}
            placeholder="Características adicionales, observaciones..." rows={3} />
        </div>
      </div>
    </Modal>
  )
}
