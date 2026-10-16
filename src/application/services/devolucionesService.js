import api from '../../infrastructure/api'

export const devolucionesService = {
  buscarTicket: async (q) => {
    const response = await api.get('/api/devoluciones/buscar_ticket', { params: { q } })
    return response.data
  },

  ventaParaDevolucion: async (idVenta) => {
    const response = await api.get(`/api/devoluciones/venta_para_devolucion/${idVenta}`)
    return response.data
  },

  devolver: async (payload) => {
    const response = await api.post('/api/devoluciones/devolver', payload)
    return response.data
  },
}
