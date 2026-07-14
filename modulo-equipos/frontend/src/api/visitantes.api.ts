import { equiposApi } from './axios'

export type TipoDocumento = 'CC' | 'CE' | 'PA' | 'TI' | 'OTRO'

export interface Visitante {
  id: string
  nombre: string
  apellido: string
  tipoDocumento: TipoDocumento
  documento: string
  telefono?: string
  empresa?: string
  motivoVisita?: string
}

export interface EquipoVisitanteDto {
  tipo: string
  marca: string
  modelo: string
  serial?: string
  descripcion?: string
}

export interface CreateVisitanteDto {
  nombre: string
  apellido: string
  tipoDocumento: TipoDocumento
  documento: string
  telefono?: string
  empresa?: string
  motivoVisita?: string
  equipos?: EquipoVisitanteDto[]
}

export async function getVisitantes(q?: string): Promise<Visitante[]> {
  const { data } = await equiposApi.get<Visitante[]>('/visitantes', { params: q ? { q } : undefined })
  return data
}

export async function createVisitante(dto: CreateVisitanteDto): Promise<Visitante> {
  const { data } = await equiposApi.post<Visitante>('/visitantes', dto)
  return data
}

export async function updateVisitante(id: string, dto: Partial<CreateVisitanteDto>): Promise<Visitante> {
  const { data } = await equiposApi.patch<Visitante>(`/visitantes/${id}`, dto)
  return data
}

export async function deleteVisitante(id: string): Promise<void> {
  await equiposApi.delete(`/visitantes/${id}`)
}
