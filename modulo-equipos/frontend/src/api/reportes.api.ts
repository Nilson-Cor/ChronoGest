import { equiposApi } from './axios'

export type TipoReporte = 'PERDIDA' | 'DANO' | 'ROBO' | 'OTRO'
export type EstadoReporte = 'ACTIVO' | 'RESUELTO'

export interface Reporte {
  id: string
  tipo: TipoReporte
  descripcion: string
  estado: EstadoReporte
  resolucion?: string
  fechaReporte: string
  fechaResolucion?: string
  equipoId: string
  equipo?: {
    id: string
    serial: string
    marca: string
    modelo: string
    tipo: string
  }
  reportadoPorId?: string
  reportadoPor?: {
    id: string
    nombre: string
    apellido: string
  }
}

export interface CreateReporteDto {
  tipo: TipoReporte
  descripcion: string
  equipoId: string
}

export interface ResolverReporteDto {
  resolucion: string
}

export interface ReportesFilter {
  tipo?: TipoReporte | ''
  estado?: EstadoReporte | ''
}

export async function getReportes(filters?: ReportesFilter): Promise<Reporte[]> {
  const { data } = await equiposApi.get<Reporte[]>('/reportes', { params: filters })
  return data
}

export async function createReporte(dto: CreateReporteDto): Promise<Reporte> {
  const { data } = await equiposApi.post<Reporte>('/reportes', dto)
  return data
}

export async function resolverReporte(id: string, dto: ResolverReporteDto): Promise<Reporte> {
  const { data } = await equiposApi.patch<Reporte>(`/reportes/${id}/resolver`, dto)
  return data
}
