import api from '../../infrastructure/api'

export const preordenesService = {
  // Crear pre-orden (público)
  crearPreorden: async (preordenData) => {
    const response = await api.post('/api/preordenes/crear_preorden', preordenData)
    return response.data
  },

  // Ver pre-orden específica
  obtenerPreorden: async (idPreorden) => {
    const response = await api.get(`/api/preordenes/ver_preorden/${idPreorden}`)
    return response.data
  },

  // Listar pre-órdenes
  obtenerPreordenes: async (estado = null) => {
    const params = estado ? { estado } : {}
    const response = await api.get('/api/preordenes/ver_preordenes', { params })
    return response.data
  },

  // Actualizar pre-orden
  actualizarPreorden: async (idPreorden, preordenData) => {
    const response = await api.put(`/api/preordenes/actualizar_preorden/${idPreorden}`, preordenData)
    return response.data
  },

  // Procesar pago de pre-orden
  procesarPago: async (idPreorden, pagoData) => {
    const response = await api.post(`/api/preordenes/procesar_pago/${idPreorden}`, pagoData)
    return response.data
  },

  // Marcar pre-orden en cocina
  marcarEnCocina: async (idPreorden) => {
    const response = await api.put(`/api/preordenes/marcar_en_cocina/${idPreorden}`)
    return response.data
  },

  // Marcar pre-orden como lista
  marcarLista: async (idPreorden) => {
    const response = await api.put(`/api/preordenes/marcar_lista/${idPreorden}`)
    return response.data
  },

  // Marcar pre-orden como entregada
  marcarEntregada: async (idPreorden) => {
    const response = await api.put(`/api/preordenes/marcar_entregada/${idPreorden}`)
    return response.data
  },
}

