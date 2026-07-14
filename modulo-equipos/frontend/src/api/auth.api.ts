import { mainApi } from './axios'

export interface LoginCredentials {
  login: string
  password: string
}

export interface AuthUser {
  id: string
  nombre: string
  apellido: string
  rol: string
  cargo: string
  idUsuario: string
  aplicativoId?: string
  fichaId?: string
  esLider?: boolean
  centroSlug?: string
}

export interface LoginResponse {
  access_token: string
  token: string
  user: AuthUser
  centroSlug?: string
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  // Usar login-auto: detecta el tenant automáticamente sin necesitar x-centro-tenant header
  const { data } = await mainApi.post<LoginResponse>('/auth/login-auto', credentials)
  return data
}
