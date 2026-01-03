import api from '../../infrastructure/api'

export const usuariosService = {
  // Crear usuario
  crearUsuario: async (usuarioData) => {
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
}

