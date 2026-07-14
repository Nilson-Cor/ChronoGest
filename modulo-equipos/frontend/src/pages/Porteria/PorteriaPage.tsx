import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { buscarPersonas, type Persona } from '../../api/personas.api'
import { getVisitantes, type Visitante } from '../../api/visitantes.api'
import { getEquipos, type Equipo } from '../../api/equipos.api'
import { estadoEquipoBadge } from '../../components/Badge'
import { tipoEquipoLabel } from '../../utils/equipoUtils'
import { TipoEquipoIcon, IcoCamera, IcoSearch, IcoWarning, IcoUser, IcoScanFace } from '../../components/Icons'
import MovimientoModal from './MovimientoModal'
import LoadingSpinner from '../../components/LoadingSpinner'

type MainTab = 'qr' | 'facial' | 'manual'
type SubTab = 'personal' | 'visitante'

export default function PorteriaPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('manual')
  const [subTab, setSubTab] = useState<SubTab>('personal')

  // ── Personal del sistema ──
  const [queryPersona, setQueryPersona] = useState('')
  const [searchingPersona, setSearchingPersona] = useState(false)
  const [personas, setPersonas] = useState<Persona[]>([])
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null)
  const [equiposPersona, setEquiposPersona] = useState<Equipo[]>([])
  const [loadingEqPersona, setLoadingEqPersona] = useState(false)
  const debouncePersona = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Visitantes externos ──
  const [queryVisitante, setQueryVisitante] = useState('')
  const [searchingVisitante, setSearchingVisitante] = useState(false)
  const [visitantes, setVisitantes] = useState<Visitante[]>([])
  const [selectedVisitante, setSelectedVisitante] = useState<Visitante | null>(null)
  const [equiposVisitante, setEquiposVisitante] = useState<Equipo[]>([])
  const [loadingEqVisitante, setLoadingEqVisitante] = useState(false)
  const debounceVisitante = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Modal ──
  const [showModal, setShowModal] = useState(false)
  const [tipoMovimiento, setTipoMovimiento] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA')

  // ───────────── Personal handlers ─────────────
  function handleQueryPersonaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQueryPersona(val)
    setSelectedPersona(null)
    setPersonas([])
    if (debouncePersona.current) clearTimeout(debouncePersona.current)
    if (val.trim().length < 2) return
    debouncePersona.current = setTimeout(async () => {
      setSearchingPersona(true)
      try {
        setPersonas(await buscarPersonas(val.trim()))
      } catch {
        toast.error('Error al buscar personas')
      } finally {
        setSearchingPersona(false)
      }
    }, 400)
  }

  async function selectPersona(p: Persona) {
    setSelectedPersona(p)
    setPersonas([])
    setQueryPersona(`${p.nombre} ${p.apellido}`)
    setLoadingEqPersona(true)
    try {
      setEquiposPersona(await getEquipos({ personaId: p.idPersona ?? p.id }))
    } catch {
      toast.error('Error al cargar equipos')
    } finally {
      setLoadingEqPersona(false)
    }
  }

  // ───────────── Visitante handlers ─────────────
  function handleQueryVisitanteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQueryVisitante(val)
    setSelectedVisitante(null)
    setVisitantes([])
    if (debounceVisitante.current) clearTimeout(debounceVisitante.current)
    if (val.trim().length < 2) return
    debounceVisitante.current = setTimeout(async () => {
      setSearchingVisitante(true)
      try {
        setVisitantes(await getVisitantes(val.trim()))
      } catch {
        toast.error('Error al buscar visitantes')
      } finally {
        setSearchingVisitante(false)
      }
    }, 400)
  }

  async function selectVisitante(v: Visitante) {
    setSelectedVisitante(v)
    setVisitantes([])
    setQueryVisitante(`${v.nombre} ${v.apellido}`)
    setLoadingEqVisitante(true)
    try {
      setEquiposVisitante(await getEquipos({ visitanteId: v.id }))
    } catch {
      toast.error('Error al cargar equipos')
    } finally {
      setLoadingEqVisitante(false)
    }
  }

  function handleSuccess() {
    setSelectedPersona(null)
    setEquiposPersona([])
    setQueryPersona('')
    setSelectedVisitante(null)
    setEquiposVisitante([])
    setQueryVisitante('')
  }

  // ── Equipos y persona activa según sub-tab ──
  const equiposActivos = subTab === 'personal' ? equiposPersona : equiposVisitante
  const loadingEqActivo = subTab === 'personal' ? loadingEqPersona : loadingEqVisitante

  return (
    <div>
      {/* Main tabs */}
      <div className="tabs">
        <button className={`tab-btn${activeTab === 'qr' ? ' active' : ''}`} onClick={() => setActiveTab('qr')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IcoCamera size={15} /> Escanear QR
        </button>
        <button className={`tab-btn${activeTab === 'facial' ? ' active' : ''}`} onClick={() => setActiveTab('facial')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IcoScanFace size={15} /> Reconocimiento facial
        </button>
        <button className={`tab-btn${activeTab === 'manual' ? ' active' : ''}`} onClick={() => setActiveTab('manual')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <IcoSearch size={15} /> Búsqueda manual
        </button>
      </div>

      {/* QR Tab */}
      {activeTab === 'qr' && (
        <div className="card">
          <div style={{ background: 'var(--yellow)', color: '#fff', padding: '10px 20px', borderRadius: '10px 10px 0 0', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcoWarning size={15} />
            EN DESARROLLO — Próximamente disponible con lector QR
          </div>
          <div className="card-body">
            <div className="qr-placeholder">
              <div className="qr-camera-icon"><IcoCamera size={48} /></div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                  Lector QR — En desarrollo
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
                  La estructura está lista para integrarse con el lector QR físico.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facial Tab */}
      {activeTab === 'facial' && (
        <div className="card">
          <div style={{ background: 'var(--yellow)', color: '#fff', padding: '10px 20px', borderRadius: '10px 10px 0 0', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <IcoWarning size={15} />
            EN DESARROLLO — Próximamente disponible con reconocimiento facial (OpenCV)
          </div>
          <div className="card-body">
            <div className="qr-placeholder">
              <div className="qr-camera-icon"><IcoScanFace size={48} /></div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                  Reconocimiento facial — En desarrollo
                </h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', maxWidth: 400 }}>
                  La estructura está lista para integrarse con OpenCV y modelos de reconocimiento facial.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Tab */}
      {activeTab === 'manual' && (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Left: search panel */}
          <div className="card" style={{ flex: 1 }}>
            {/* Sub-tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => { setSubTab('personal'); setSelectedVisitante(null) }}
                style={{
                  flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: 'none',
                  color: subTab === 'personal' ? 'var(--navy)' : 'var(--text-muted)',
                  borderBottom: subTab === 'personal' ? '2px solid var(--navy)' : '2px solid transparent',
                  transition: 'all .15s',
                }}
              >
                Personal del sistema
              </button>
              <button
                onClick={() => { setSubTab('visitante'); setSelectedPersona(null) }}
                style={{
                  flex: 1, padding: '12px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  background: 'none',
                  color: subTab === 'visitante' ? 'var(--navy)' : 'var(--text-muted)',
                  borderBottom: subTab === 'visitante' ? '2px solid var(--navy)' : '2px solid transparent',
                  transition: 'all .15s',
                }}
              >
                Visitante externo
              </button>
            </div>

            <div className="card-body">
              {/* ── Personal search ── */}
              {subTab === 'personal' && (
                <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
                  <label className="form-label">Nombre o número de documento</label>
                  <div style={{ position: 'relative' }}>
                    <IcoSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 34 }}
                      placeholder="Ej: Juan Pérez o 1234567890"
                      value={queryPersona}
                      onChange={handleQueryPersonaChange}
                      autoFocus
                    />
                    {searchingPersona && (
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <LoadingSpinner size={16} />
                      </div>
                    )}
                  </div>
                  {personas.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 10px 10px', boxShadow: 'var(--shadow-lg)', maxHeight: 280, overflowY: 'auto' }}>
                      {personas.map((p) => (
                        <button key={p.idPersona ?? p.id} onClick={() => selectPersona(p)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {p.nombre[0]}{p.apellido[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre} {p.apellido}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.cedula ?? p.documento} — {p.cargo}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Visitante search ── */}
              {subTab === 'visitante' && (
                <div className="form-group" style={{ position: 'relative', marginBottom: 0 }}>
                  <label className="form-label">Nombre o número de documento del visitante</label>
                  <div style={{ position: 'relative' }}>
                    <IcoSearch size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      className="form-input"
                      style={{ paddingLeft: 34 }}
                      placeholder="Ej: María García o 9876543210"
                      value={queryVisitante}
                      onChange={handleQueryVisitanteChange}
                      autoFocus
                    />
                    {searchingVisitante && (
                      <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                        <LoadingSpinner size={16} />
                      </div>
                    )}
                  </div>
                  {visitantes.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 10px 10px', boxShadow: 'var(--shadow-lg)', maxHeight: 280, overflowY: 'auto' }}>
                      {visitantes.map((v) => (
                        <button key={v.id} onClick={() => selectVisitante(v)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface2)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                        >
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {v.nombre[0]}{v.apellido[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{v.nombre} {v.apellido}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.tipoDocumento} {v.documento}{v.empresa ? ` — ${v.empresa}` : ''}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel: selected person + equipos */}
          {(selectedPersona || selectedVisitante) && (
            <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Person card */}
              <div className="card">
                <div className="card-body" style={{ padding: 16 }}>
                  <div className="persona-card">
                    <div className="persona-avatar" style={{ background: selectedVisitante ? 'var(--yellow)' : undefined }}>
                      {selectedPersona
                        ? `${selectedPersona.nombre[0]}${selectedPersona.apellido[0]}`
                        : `${selectedVisitante!.nombre[0]}${selectedVisitante!.apellido[0]}`}
                    </div>
                    <div className="persona-info" style={{ flex: 1 }}>
                      {selectedPersona && (
                        <>
                          <h3>{selectedPersona.nombre} {selectedPersona.apellido}</h3>
                          <p>{selectedPersona.cargo}</p>
                          <p style={{ marginTop: 2 }}>Doc: {selectedPersona.cedula ?? selectedPersona.documento}</p>
                        </>
                      )}
                      {selectedVisitante && (
                        <>
                          <h3>{selectedVisitante.nombre} {selectedVisitante.apellido}</h3>
                          <p style={{ color: 'var(--yellow)', fontWeight: 600, fontSize: 12 }}>Visitante externo</p>
                          <p style={{ marginTop: 2 }}>Doc: {selectedVisitante.tipoDocumento} {selectedVisitante.documento}</p>
                          {selectedVisitante.empresa && <p>{selectedVisitante.empresa}</p>}
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-green btn-sm" onClick={() => { setTipoMovimiento('ENTRADA'); setShowModal(true) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 18l7 7 7-7"/></svg>
                        Entrada
                      </button>
                      <button className="btn btn-red btn-sm" onClick={() => { setTipoMovimiento('SALIDA'); setShowModal(true) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 6l7-7 7 7"/></svg>
                        Salida
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipos */}
              <div className="card">
                <div className="card-header">
                  <h2>Equipos {selectedVisitante ? 'del visitante' : 'asignados'}</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {equiposActivos.length} equipo{equiposActivos.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="card-body">
                  {loadingEqActivo ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                      <LoadingSpinner size={28} />
                    </div>
                  ) : equiposActivos.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                      {selectedVisitante ? 'Este visitante no tiene equipos registrados' : 'No hay equipos asignados a esta persona'}
                    </p>
                  ) : (
                    equiposActivos.map((eq) => (
                      <div key={eq.id} className="equipo-item">
                        <span className="equipo-icon"><TipoEquipoIcon tipo={eq.tipo} size={18} /></span>
                        <div className="equipo-info">
                          <strong>{eq.marca} {eq.modelo}</strong>
                          <span>{tipoEquipoLabel(eq.tipo)} · Serial: {eq.serial}</span>
                        </div>
                        <span style={{
                          fontSize: 11, padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                          background: eq.dentroDelCentro ? 'rgba(22,163,74,.12)' : 'rgba(148,163,184,.12)',
                          color: eq.dentroDelCentro ? 'var(--green)' : 'var(--text-muted)',
                        }}>
                          {eq.dentroDelCentro ? 'Dentro' : 'Fuera'}
                        </span>
                        {estadoEquipoBadge(eq.estado)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <MovimientoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={handleSuccess}
        persona={selectedPersona}
        visitanteId={selectedVisitante?.id}
        visitanteNombre={selectedVisitante ? `${selectedVisitante.nombre} ${selectedVisitante.apellido}` : undefined}
        equipos={equiposActivos}
        tipoDefault={tipoMovimiento}
      />
    </div>
  )
}
