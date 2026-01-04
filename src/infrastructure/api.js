import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para agregar el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Si es FormData, eliminar Content-Type para que el navegador lo establezca automáticamente
  // con el boundary correcto para multipart/form-data
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      // Redirigir al login si no estamos ya ahí
      // Evitar bucles de redirección
      if (window.location.pathname !== '/login' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    // Si hay error de red (sin respuesta), no redirigir automáticamente
    // Dejar que los componentes manejen el error
    if (!error.response && error.code === 'ERR_NETWORK') {
      console.error('Error de red: Backend no disponible')
    }
    return Promise.reject(error)
  }
)

export default api

