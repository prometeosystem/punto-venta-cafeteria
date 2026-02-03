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

  // Obtener comandas terminadas sin pagar (para PuntoVenta)
  obtenerComandasTerminadasSinPagar: async () => {
    const response = await api.get('/api/comandas/terminadas_sin_pagar')
    return response.data
  },

  // Actualizar estado de comanda
  // permitirStockNegativo: si true, permite terminar comanda aunque haya stock insuficiente (inventario puede quedar negativo)
  actualizarEstadoComanda: async (idComanda, estado, permitirStockNegativo = false) => {
    let url = `/api/comandas/actualizar_estado_comanda/${idComanda}?estado=${estado}`
    if (permitirStockNegativo) {
      url += '&permitir_stock_negativo=true'
    }
    const response = await api.put(url)
    return response.data
  },
}




