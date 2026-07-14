import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import {
  createVisitante, updateVisitante,
  type Visitante, type CreateVisitanteDto, type TipoDocumento, type EquipoVisitanteDto,
} from '../../api/visitantes.api'
import { TIPO_EQUIPO_OPTIONS } from '../../utils/equipoUtils'
import { IcoPlus, IcoTrash, TipoEquipoIcon } from '../../components/Icons'
import LoadingSpinner from '../../components/LoadingSpinner'

interface VisitanteModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  visitante?: Visitante | null
}

const INITIAL_VISITANTE: Omit<CreateVisitanteDto, 'equipos'> = {
  nombre: '', apellido: '', tipoDocumento: 'CC', documento: '',
  telefono: '', empresa: '', motivoVisita: '',
}

const INITIAL_EQUIPO: EquipoVisitanteDto = {
  tipo: 'portatil', marca: '', modelo: '', serial: '', descripcion: '',
}

export default function VisitanteModal({ open, onClose, onSuccess, visitante }: VisitanteModalProps) {
  const [form, setForm] = useState<Omit<CreateVisitanteDto, 'equipos'>>(INITIAL_VISITANTE)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [loading, setLoading] = useState(false)

  // Equipos del visitante (solo al crear)
  const [equipos, setEquipos] = useState<EquipoVisitanteDto[]>([])
  const [nuevoEquipo, setNuevoEquipo] = useState<EquipoVisitanteDto>(INITIAL_EQUIPO)
  const [mostrarFormEquipo, setMostrarFormEquipo] = useState(false)

  useEffect(() => {
    if (open) {
      setForm(visitante
        ? {
            nombre: visitante.nombre, apellido: visitante.apellido,
            tipoDocumento: visitante.tipoDocumento, documento: visitante.documento,
            telefono: visitante.telefono ?? '', empresa: visitante.empresa ?? '',
            motivoVisita: visitante.motivoVisita ?? '',
          }
        : INITIAL_VISITANTE
      )
      setErrors({})
      setEquipos([])
      setNuevoEquipo(INITIAL_EQUIPO)
      setMostrarFormEquipo(false)
    }
  }, [open, visitante])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  function setEq(field: keyof EquipoVisitanteDto, value: string) {
    setNuevoEquipo((e) => ({ ...e, [field]: value }))
    if (errors[`eq_${field}`]) setErrors((e) => ({ ...e, [`eq_${field}`]: undefined }))
  }

  function agregarEquipo() {
    const errs: Record<string, string> = {}
    if (!nuevoEquipo.marca.trim()) errs.eq_marca = 'Requerido'
    if (!nuevoEquipo.modelo.trim()) errs.eq_modelo = 'Requerido'
    if (Object.keys(errs).length > 0) { setErrors((e) => ({ ...e, ...errs })); return }
    setEquipos((prev) => [...prev, { ...nuevoEquipo }])
    setNuevoEquipo(INITIAL_EQUIPO)
    setMostrarFormEquipo(false)
  }

  function quitarEquipo(idx: number) {
    setEquipos((prev) => prev.filter((_, i) => i !== idx))
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim()) errs.nombre = 'Requerido'
    if (!form.apellido.trim()) errs.apellido = 'Requerido'
    if (!form.documento.trim()) errs.documento = 'Requerido'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)
    try {
      if (visitante) {
        await updateVisitante(visitante.id, {
          nombre: form.nombre.trim(), apellido: form.apellido.trim(),
          tipoDocumento: form.tipoDocumento, documento: form.documento.trim(),
          telefono: form.telefono?.trim() || undefined,
          empresa: form.empresa?.trim() || undefined,
          motivoVisita: form.motivoVisita?.trim() || undefined,
        })
        toast.success('Visitante actualizado')
      } else {
        await createVisitante({
          nombre: form.nombre.trim(), apellido: form.apellido.trim(),
          tipoDocumento: form.tipoDocumento, documento: form.documento.trim(),
          telefono: form.telefono?.trim() || undefined,
          empresa: form.empresa?.trim() || undefined,
          motivoVisita: form.motivoVisita?.trim() || undefined,
          equipos: equipos.length > 0 ? equipos.map(e => ({
            ...e,
            marca: e.marca.trim(),
            modelo: e.modelo.trim(),
            serial: e.serial?.trim() || undefined,
            descripcion: e.descripcion?.trim() || undefined,
          })) : undefined,
        })
        toast.success(`Visitante registrado${equipos.length > 0 ? ` con ${equipos.length} equipo${equipos.length > 1 ? 's' : ''}` : ''}`)
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message
      toast.error(typeof msg === 'string' ? msg : 'Error al guardar el visitante')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={visitante ? 'Editar visitante' : 'Registrar visitante'}
      size="lg"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn btn-navy" onClick={handleSave} disabled={loading}>
            {loading && <LoadingSpinner size={16} />}
            {visitante ? 'Guardar' : 'Registrar'}
          </button>
        </>
      }
    >
      {/* Datos del visitante */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
        <div className="form-group">
          <label className="form-label">Nombre *</label>
          <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre"
            style={{ borderColor: errors.nombre ? 'var(--red)' : undefined }} />
          {errors.nombre && <p className="form-error">{errors.nombre}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Apellido *</label>
          <input className="form-input" value={form.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Apellido"
            style={{ borderColor: errors.apellido ? 'var(--red)' : undefined }} />
          {errors.apellido && <p className="form-error">{errors.apellido}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Tipo documento</label>
          <select className="form-select" value={form.tipoDocumento} onChange={(e) => set('tipoDocumento', e.target.value as TipoDocumento)}>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="PA">Pasaporte</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="OTRO">Otro</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Número de documento *</label>
          <input className="form-input" value={form.documento} onChange={(e) => set('documento', e.target.value)} placeholder="1234567890"
            style={{ borderColor: errors.documento ? 'var(--red)' : undefined }} />
          {errors.documento && <p className="form-error">{errors.documento}</p>}
        </div>
        <div className="form-group">
          <label className="form-label">Teléfono</label>
          <input className="form-input" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="300 000 0000" />
        </div>
        <div className="form-group">
          <label className="form-label">Empresa / Institución</label>
          <input className="form-input" value={form.empresa ?? ''} onChange={(e) => set('empresa', e.target.value)} placeholder="Empresa de origen" />
        </div>
        <div className="form-group" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Motivo de visita</label>
          <textarea className="form-textarea" value={form.motivoVisita ?? ''} onChange={(e) => set('motivoVisita', e.target.value)} rows={2} placeholder="¿Por qué visita las instalaciones?" />
        </div>
      </div>

      {/* Equipos — solo al crear */}
      {!visitante && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <label className="form-label" style={{ margin: 0 }}>
              Equipos que ingresa ({equipos.length})
            </label>
            {!mostrarFormEquipo && (
              <button type="button" className="btn btn-ghost btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => setMostrarFormEquipo(true)}>
                <IcoPlus size={13} /> Agregar equipo
              </button>
            )}
          </div>

          {/* Lista de equipos registrados */}
          {equipos.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
              {equipos.map((eq, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--surface2)', borderRadius: 8,
                  padding: '8px 12px', border: '1px solid var(--border)',
                }}>
                  <TipoEquipoIcon tipo={eq.tipo} size={16} />
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <strong>{eq.marca} {eq.modelo}</strong>
                    {eq.serial && <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>#{eq.serial}</span>}
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)', padding: '2px 6px' }}
                    onClick={() => quitarEquipo(i)}>
                    <IcoTrash size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulario inline para nuevo equipo */}
          {mostrarFormEquipo && (
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 14, marginBottom: 8,
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Tipo de equipo</label>
                  <select className="form-select" value={nuevoEquipo.tipo} onChange={(e) => setEq('tipo', e.target.value)}>
                    {TIPO_EQUIPO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Marca *</label>
                  <input className="form-input" value={nuevoEquipo.marca} onChange={(e) => setEq('marca', e.target.value)}
                    placeholder="Dell, HP, Lenovo..."
                    style={{ borderColor: errors.eq_marca ? 'var(--red)' : undefined }} />
                  {errors.eq_marca && <p className="form-error">{errors.eq_marca}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Modelo *</label>
                  <input className="form-input" value={nuevoEquipo.modelo} onChange={(e) => setEq('modelo', e.target.value)}
                    placeholder="Latitude 5420..."
                    style={{ borderColor: errors.eq_modelo ? 'var(--red)' : undefined }} />
                  {errors.eq_modelo && <p className="form-error">{errors.eq_modelo}</p>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Serial (opcional)</label>
                  <input className="form-input" value={nuevoEquipo.serial ?? ''} onChange={(e) => setEq('serial', e.target.value)} placeholder="SN-2024-001" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Descripción (opcional)</label>
                  <input className="form-input" value={nuevoEquipo.descripcion ?? ''} onChange={(e) => setEq('descripcion', e.target.value)} placeholder="Notas..." />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setMostrarFormEquipo(false); setNuevoEquipo(INITIAL_EQUIPO) }}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-navy btn-sm" onClick={agregarEquipo}>
                  <IcoPlus size={13} /> Agregar
                </button>
              </div>
            </div>
          )}

          {equipos.length === 0 && !mostrarFormEquipo && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Si el visitante trae equipos, agrégalos aquí para controlar su ingreso y salida.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}
