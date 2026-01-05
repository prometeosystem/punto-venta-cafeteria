import api from '../../infrastructure/api'

export const usuariosService = {
  // Crear usuario
  crearUsuario: async (usuarioData) => {
    // Verificación de seguridad (opcional, para debug)
    if (usuarioData.contrasena && typeof usuarioData.contrasena !== 'string') {
      console.error('❌ ERROR: La contraseña no es un string en el servicio:', usuarioData.contrasena)
      throw new Error('La contraseña debe ser un texto válido')
    }
    
    console.log('📡 Enviando al backend - Tipo de contrasena:', typeof usuarioData.contrasena)
    if (usuarioData.contrasena) {
      console.log('📡 Enviando al backend - Longitud de contrasena:', usuarioData.contrasena.length)
    }
    
    const response = await api.post('/api/usuarios/crear_usuario', usuarioData)
    return response.data
  },

  // Listar usuarios
  obtenerUsuarios: async () => {
    const response = await api.get('/api/usuarios/ver_usuarios')
    return response.data
  },

  // Ver usuario específico
  obtenerUsuario: async (idUsuario) => {
    const response = await api.get(`/api/usuarios/ver_usuario/${idUsuario}`)
    return response.data
  },

  // Editar usuario
  editarUsuario: async (idUsuario, usuarioData) => {
    const response = await api.put(`/api/usuarios/editar_usuario/${idUsuario}`, usuarioData)
    return response.data
  },

  // Eliminar usuario (desactivar)
  eliminarUsuario: async (idUsuario) => {
    const response = await api.delete(`/api/usuarios/eliminar_usuario/${idUsuario}`)
    return response.data
  },

  // Obtener estadísticas de empleados
  obtenerEstadisticas: async () => {
    const response = await api.get('/api/usuarios/estadisticas')
    return response.data
  },
}

