import { equiposApi } from './axios'

export type TipoMovimiento = 'ENTRADA' | 'SALIDA'
export type TipoPersonaMovimiento = 'SISTEMA' | 'EXTERNO'

export interface MovimientoEquipo {
  equipoId: string
  equipo?: {
    id: string
    serial: string
    tipo: string
    marca: string
    modelo: string
  }
}

export interface Movimiento {
  id: string
  tipo: TipoMovimiento
  fechaHora: string
  observaciones?: string
  tipoPersona: TipoPersonaMovimiento
  personaId?: string
  visitanteId?: string
  registradoPorId?: string
  registradoPorNombre?: string
  persona?: {
    id: string
    nombre: string
    apellido: string
    documento: string
  }
  visitante?: {
    id: string
    nombre: string
    apellido: string
    documento: string
  }
  registradoPor?: {
    id: string
    nombre: string
    apellido: string
  }
  // El backend devuelve movimientoEquipos; lo normalizamos a equipos en la API
  equipos: MovimientoEquipo[]
  movimientoEquipos?: MovimientoEquipo[]
}

export interface CreateMovimientoDto {
  tipo: TipoMovimiento
  tipoPersona: TipoPersonaMovimiento
  personaId?: string
  visitanteId?: string
  equipos: { equipoId: string }[]
  observaciones?: string
}

export interface MovimientosFilter {
  tipo?: TipoMovimiento | ''
  tipoPersona?: TipoPersonaMovimiento | ''
  desde?: string
  hasta?: string
}

// Normaliza la respuesta del backend: movimientoEquipos → equipos
function normalize(m: any): Movimiento {
  return {
    ...m,
    equipos: m.movimientoEquipos ?? m.equipos ?? [],
  }
}

export async function getMovimientos(filters?: MovimientosFilter): Promise<Movimiento[]> {
  const { data } = await equiposApi.get<{ data: any[]; total: number } | any[]>('/movimientos', { params: filters })
  const list = Array.isArray(data) ? data : (data.data ?? [])
  return list.map(normalize)
}

export async function getMovimientosRecientes(limit = 10): Promise<Movimiento[]> {
  const { data } = await equiposApi.get<any[]>('/movimientos/recientes', { params: { limit } })
  return (Array.isArray(data) ? data : []).map(normalize)
}

export async function createMovimiento(dto: CreateMovimientoDto): Promise<Movimiento> {
  const { data } = await equiposApi.post<any>('/movimientos', dto)
  return normalize(data)
}
