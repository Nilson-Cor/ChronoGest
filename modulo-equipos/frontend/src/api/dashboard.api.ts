import { equiposApi } from './axios'

export interface DashboardStats {
  personasDentro: number
  personasSistemaDentro: number
  visitantesDentro: number
  entradasHoy: number
  salidasHoy: number
  equiposActivos: number
  equiposReportados: number
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data } = await equiposApi.get<DashboardStats>('/dashboard')
  return data
}
