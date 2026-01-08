import api from '../../infrastructure/api'

export const authService = {
  // Login
  login: async (correo, contrasena) => {
    const response = await api.post('/api/login', {
      correo,
      contrasena,
    })
    
    // Guardar token y usuario
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token)
      localStorage.setItem('usuario', JSON.stringify(response.data.usuario))
    }
    
    return response.data
  },

  // Obtener usuario actual
  getCurrentUser: async () => {
    const response = await api.get('/api/me')
    return response.data
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
  },

  // Verificar si hay token
  isAuthenticated: () => {
    return !!localStorage.getItem('token')
  },

  // Obtener usuario del localStorage
  getStoredUser: () => {
    const usuario = localStorage.getItem('usuario')
    return usuario ? JSON.parse(usuario) : null
  },
}




