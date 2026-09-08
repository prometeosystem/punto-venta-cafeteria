import api from '../../infrastructure/api'

const BASE = '/api/opciones-producto'

export const opcionesProductoService = {
  // soloActivas: true para el punto de venta, false para la pantalla de ajustes
  listar: async (soloActivas = false) => {
    const response = await api.get(`${BASE}/`, { params: { solo_activas: soloActivas } })
    return response.data
  },

  crear: async (opcion) => {
    const response = await api.post(`${BASE}/`, opcion)
    return response.data
  },

  editar: async (idOpcion, cambios) => {
    const response = await api.put(`${BASE}/${idOpcion}`, cambios)
    return response.data
  },

  // No borra el registro: lo desactiva para no perder el historial de ventas.
  desactivar: async (idOpcion) => {
    const response = await api.delete(`${BASE}/${idOpcion}`)
    return response.data
  },

  listarGrupos: async (soloActivos = false) => {
    const response = await api.get(`${BASE}/grupos`, { params: { solo_activos: soloActivos } })
    return response.data
  },

  // Mapa id_producto -> [id_grupo]: define qué opciones ve cada producto
  gruposPorProducto: async () => {
    const response = await api.get(`${BASE}/grupos/por-producto`)
    return response.data
  },

  crearGrupo: async (grupo) => {
    const response = await api.post(`${BASE}/grupos`, grupo)
    return response.data
  },

  editarGrupo: async (idGrupo, cambios) => {
    const response = await api.put(`${BASE}/grupos/${idGrupo}`, cambios)
    return response.data
  },

  asignarGruposAProducto: async (idProducto, grupos) => {
    const response = await api.put(`${BASE}/productos/${idProducto}/grupos`, { grupos })
    return response.data
  },
}

export default opcionesProductoService
