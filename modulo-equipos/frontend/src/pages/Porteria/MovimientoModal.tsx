import { useState } from 'react'
import toast from 'react-hot-toast'
import Modal from '../../components/Modal'
import { createMovimiento } from '../../api/movimientos.api'
import type { TipoMovimiento, TipoPersonaMovimiento } from '../../api/movimientos.api'
import type { Persona } from '../../api/personas.api'
import type { Equipo } from '../../api/equipos.api'
import { TipoEquipoIcon } from '../../components/Icons'
import LoadingSpinner from '../../components/LoadingSpinner'

interface MovimientoModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  persona: Persona | null
  visitanteId?: string
  visitanteNombre?: string
  equipos: Equipo[]
  tipoDefault?: TipoMovimiento
}

export default function MovimientoModal({
  open, onClose, onSuccess,
  persona, visitanteId, visitanteNombre,
  equipos, tipoDefault = 'ENTRADA',
}: MovimientoModalProps) {
  const [tipo, setTipo] = useState<TipoMovimiento>(tipoDefault)
  const [observaciones, setObservaciones] = useState('')
  const [selectedEquipos, setSelectedEquipos] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  function toggleEquipo(id: string) {
    setSelectedEquipos((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleConfirm() {
    if (selectedEquipos.size === 0) {
      toast.error('Selecciona al menos un equipo')
      return
    }
    setLoading(true)
    try {
      const tipoPersona: TipoPersonaMovimiento = persona ? 'SISTEMA' : 'EXTERNO'
      await createMovimiento({
        tipo,
        tipoPersona,
        personaId: persona?.idPersona ?? persona?.id,
        visitanteId,
        equipos: Array.from(selectedEquipos).map((equipoId) => ({ equipoId })),
        observaciones: observaciones.trim() || undefined,
      })
      toast.success(`${tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada`)
      setSelectedEquipos(new Set())
      setObservaciones('')
      onSuccess()
      onClose()
    } catch {
      toast.error('Error al registrar el movimiento')
    } finally {
      setLoading(false)
    }
  }

  const nombrePersona = persona
    ? `${persona.nombre} ${persona.apellido}`
    : visitanteNombre ?? 'Visitante'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar movimiento"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancelar</button>
          <button
            className={`btn ${tipo === 'ENTRADA' ? 'btn-green' : 'btn-red'}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading && <LoadingSpinner size={16} />}
            Confirmar {tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
          </button>
        </>
      }
    >
      <div>
        {/* Persona info */}
        <div className="persona-card" style={{ marginBottom: 20 }}>
          <div className="persona-avatar">
            {nombrePersona.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="persona-info">
            <h3>{nombrePersona}</h3>
            {persona && <p>{persona.cargo ?? persona.documento}</p>}
            {visitanteId && <p>Visitante externo</p>}
          </div>
        </div>

        {/* Tipo */}
        <div className="form-group">
          <label className="form-label">Tipo de movimiento</label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className={`btn ${tipo === 'ENTRADA' ? 'btn-green' : 'btn-ghost'}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setTipo('ENTRADA')}
            >
              ↓ Entrada
            </button>
            <button
              type="button"
              className={`btn ${tipo === 'SALIDA' ? 'btn-red' : 'btn-ghost'}`}
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => setTipo('SALIDA')}
            >
              ↑ Salida
            </button>
          </div>
        </div>

        {/* Equipos */}
        <div className="form-group">
          <label className="form-label">
            Equipos ({selectedEquipos.size} seleccionado{selectedEquipos.size !== 1 ? 's' : ''})
          </label>
          {equipos.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Esta persona no tiene equipos registrados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {equipos.map((eq) => {
                // Bloquear según estado y tipo de movimiento
                const dentro = eq.dentroDelCentro ?? false
                const bloqueado = tipo === 'ENTRADA' ? dentro : !dentro
                const razon = tipo === 'ENTRADA'
                  ? (dentro ? 'Ya está dentro del centro' : '')
                  : (!dentro ? 'Ya está fuera del centro' : '')
                return (
                  <label
                    key={eq.id}
                    className="checkbox-item"
                    style={{ opacity: bloqueado ? 0.45 : 1, cursor: bloqueado ? 'not-allowed' : 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEquipos.has(eq.id)}
                      onChange={() => !bloqueado && toggleEquipo(eq.id)}
                      disabled={bloqueado}
                    />
                    <TipoEquipoIcon tipo={eq.tipo} size={20} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13 }}>{eq.marca} {eq.modelo}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Serial: {eq.serial}</div>
                    </div>
                    {bloqueado && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {razon}
                      </span>
                    )}
                    {!bloqueado && (
                      <span style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 20, fontWeight: 600,
                        background: dentro ? 'rgba(22,163,74,.12)' : 'rgba(148,163,184,.12)',
                        color: dentro ? 'var(--green)' : 'var(--text-muted)',
                      }}>
                        {dentro ? 'Dentro' : 'Fuera'}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Observaciones */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Observaciones (opcional)</label>
          <textarea
            className="form-textarea"
            placeholder="Alguna nota sobre este movimiento..."
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
          />
        </div>
      </div>
    </Modal>
  )
}
