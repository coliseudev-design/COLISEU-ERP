import axios, { AxiosError } from 'axios'

// Base URL: em dev usa proxy do Vite para localhost:3000, em produção usa mesma origem
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('coliseu_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Inject client's timezone offset (in minutes, sign reversed to represent offset from UTC)
  const offsetMinutes = -new Date().getTimezoneOffset();
  config.headers['X-Timezone-Offset'] = offsetMinutes.toString();

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      config.headers['X-User-Timezone'] = tz;
    }
  } catch (e) {
    // ignore
  }

  return config
})

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      // Token expirado/inválido
      localStorage.removeItem('coliseu_token')
      localStorage.removeItem('coliseu_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  },
)

export default api
