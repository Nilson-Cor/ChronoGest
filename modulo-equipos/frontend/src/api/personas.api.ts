import { equiposApi } from './axios'

export interface Persona {
  // El sistema principal usa idPersona y cedula
  id: string          // mapeado desde idPersona
  idPersona?: string
  nombre: string
  apellido: string
  cedula?: number | string   // campo real del sistema principal
  documento?: string         // alias para compatibilidad
  tipoDoc?: string
  cargo?: string
  correo?: string
  fotoPerfil?: string
  estado?: string
  tipo?: 'SISTEMA' | 'EXTERNO'
}

export async function getTodasPersonas(): Promise<Persona[]> {
  const { data } = await equiposApi.get<Persona[]>('/personas/todas')
  return data
}

export async function buscarPersonas(q: string): Promise<Persona[]> {
  const { data } = await equiposApi.get<Persona[]>('/personas/buscar', { params: { q } })
  return data
}
