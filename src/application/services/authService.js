import api from '../../infrastructure/api'

const guardarSesion = (data) => {
  if (data.access_token) {
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
  }
  return data
}

export const authService = {
  // Login
  login: async (correo, contrasena) => {
    const response = await api.post('/api/login', {
      correo,
      contrasena,
    })
    return guardarSesion(response.data)
  },

  // Tarjetas de la pantalla de inicio. No requiere sesión.
  usuariosParaLogin: async () => {
    const response = await api.get('/api/login/usuarios')
    return response.data
  },

  loginConCodigo: async (idUsuario, codigo) => {
    const response = await api.post('/api/login/codigo', {
      id_usuario: idUsuario,
      codigo,
    })
    return guardarSesion(response.data)
  },

  // Obtener usuario actual
  getCurrentUser: async () => {
    const response = await api.get('/api/me')
    return response.data
  },

  // Datos propios, sin rol. Regresa token nuevo porque la sesión va ligada al correo.
  actualizarPerfil: async (datos) => {
    const response = await api.put('/api/me/perfil', datos)
    const { perfil, ...sesion } = response.data
    guardarSesion({ ...sesion, usuario: perfil })
    return perfil
  },

  // El código actual no se pide si el usuario tiene pendiente cambiar el de por defecto
  cambiarCodigo: async (codigoActual, codigoNuevo) => {
    const response = await api.put('/api/me/codigo', {
      codigo_actual: codigoActual || null,
      codigo_nuevo: codigoNuevo,
    })
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




