import api from '../../infrastructure/api'

export const comandasService = {
  // Crear comanda
  crearComanda: async (comandaData) => {
    const response = await api.post('/api/comandas/crear_comanda', comandaData)
    return response.data
  },

  // Ver comanda específica
  obtenerComanda: async (idComanda) => {
    const response = await api.get(`/api/comandas/ver_comanda/${idComanda}`)
    return response.data
  },

  // Listar comandas
  obtenerComandas: async (estado = null) => {
    const params = estado ? { estado } : {}
    const response = await api.get('/api/comandas/ver_comandas', { params })
    return response.data
  },

  // Actualizar estado de comanda
  actualizarEstadoComanda: async (idComanda, estado) => {
    const response = await api.put(
      `/api/comandas/actualizar_estado_comanda/${idComanda}?estado=${estado}`
    )
    return response.data
  },
}



