import type { TipoEquipo } from '../api/equipos.api'

// Nombre del icono SVG por tipo (ver Icons.tsx)
export function tipoEquipoIconName(tipo: TipoEquipo | string): string {
  const map: Record<string, string> = {
    portatil:   'laptop',
    tablet:     'tablet',
    cargador:   'plug',
    mouse:      'mouse',
    teclado:    'keyboard',
    disco_duro: 'harddrive',
    otro:       'box',
  }
  return map[tipo] ?? 'box'
}

export function tipoEquipoLabel(tipo: TipoEquipo | string): string {
  const labels: Record<string, string> = {
    portatil:   'Portátil',
    tablet:     'Tablet',
    cargador:   'Cargador',
    mouse:      'Mouse',
    teclado:    'Teclado',
    disco_duro: 'Disco duro',
    otro:       'Otro',
  }
  return labels[tipo] ?? tipo
}

export const TIPO_EQUIPO_OPTIONS: Array<{ value: TipoEquipo; label: string }> = [
  { value: 'portatil',   label: 'Portátil' },
  { value: 'tablet',     label: 'Tablet' },
  { value: 'cargador',   label: 'Cargador' },
  { value: 'mouse',      label: 'Mouse' },
  { value: 'teclado',    label: 'Teclado' },
  { value: 'disco_duro', label: 'Disco duro' },
  { value: 'otro',       label: 'Otro' },
]

// Convierte timestamp del backend (puede venir sin Z = no-tz) a fecha Colombia
function toDate(iso: string): Date {
  // Si no tiene indicador de timezone, asumimos que el backend devuelve UTC
  if (iso && !iso.endsWith('Z') && !iso.includes('+') && !/\d{2}:\d{2}:\d{2}-\d{2}/.test(iso)) {
    return new Date(iso + 'Z')
  }
  return new Date(iso)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(toDate(iso))
}

export function formatDateOnly(iso: string): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(toDate(iso))
}
