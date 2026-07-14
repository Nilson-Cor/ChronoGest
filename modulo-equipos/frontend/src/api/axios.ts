import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001/api'
const MAIN_API_URL = import.meta.env.VITE_MAIN_API_URL ?? 'http://localhost:3000/api'

function getToken(): string | null {
  return localStorage.getItem('equipo_token')
}

// Axios instance for THIS module's backend (port 3001)
export const equiposApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

equiposApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

equiposApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('equipo_token')
      localStorage.removeItem('equipo_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// Axios instance for the MAIN system (port 3000)
export const mainApi = axios.create({
  baseURL: MAIN_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

mainApi.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default equiposApi
