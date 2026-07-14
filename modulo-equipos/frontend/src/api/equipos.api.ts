import { equiposApi } from './axios'

export type TipoEquipo = 'portatil' | 'tablet' | 'cargador' | 'mouse' | 'teclado' | 'disco_duro' | 'otro'
export type EstadoEquipo = 'activo' | 'reportado' | 'dado_de_baja'

export interface Equipo {
  id: string
  serial: string
  tipo: TipoEquipo
  marca: string
  modelo: string
  descripcion?: string
  estado: EstadoEquipo
  personaId?: string | null
  visitanteId?: string | null
  dentroDelCentro?: boolean
  persona?: {
    idPersona?: string
    id?: string
    nombre: string
    apellido: string
    cedula?: number | string
    documento?: string
    cargo?: string
  }
  visitante?: {
    id: string
    nombre: string
    apellido: string
    documento: string
  }
}

export interface CreateEquipoDto {
  serial: string
  tipo: TipoEquipo
  marca: string
  modelo: string
  descripcion?: string
  personaId?: string
}

export interface EquiposFilter {
  tipo?: TipoEquipo | ''
  estado?: EstadoEquipo | ''
  q?: string
  personaId?: string
  visitanteId?: string
}

export async function getEquipos(filters?: EquiposFilter): Promise<Equipo[]> {
  const { data } = await equiposApi.get<Equipo[]>('/equipos', { params: filters })
  return data
}

export async function getEquipo(id: string): Promise<Equipo> {
  const { data } = await equiposApi.get<Equipo>(`/equipos/${id}`)
  return data
}

export async function createEquipo(dto: CreateEquipoDto): Promise<Equipo> {
  const { data } = await equiposApi.post<Equipo>('/equipos', dto)
  return data
}

export async function updateEquipo(id: string, dto: Partial<CreateEquipoDto> & { estado?: EstadoEquipo }): Promise<Equipo> {
  const { data } = await equiposApi.patch<Equipo>(`/equipos/${id}`, dto)
  return data
}

export async function deleteEquipo(id: string): Promise<void> {
  await equiposApi.delete(`/equipos/${id}`)
}
