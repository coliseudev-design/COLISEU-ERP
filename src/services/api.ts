import axios, { AxiosError } from 'axios'

// Base URL: em dev usa proxy do Vite para localhost:3000, em produção usa mesma origem
const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  let token = localStorage.getItem('coliseu_token')
  if (!token) {
    try {
      const sess = sessionStorage.getItem('coliseu_session')
      if (sess) {
        const parsed = JSON.parse(sess)
        token = parsed?.token || parsed?.funcionario?.id || 'session_user'
      }
    } catch {
      // ignore
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  try {
    const sess = sessionStorage.getItem('coliseu_session')
    if (sess) {
      const parsed = JSON.parse(sess)
      if (parsed?.filialAtiva) {
        config.headers['X-Tenant-Id'] = parsed.filialAtiva
      }
    }
  } catch {
    // ignore
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
    return Promise.reject(err)
  },
)

export default api
