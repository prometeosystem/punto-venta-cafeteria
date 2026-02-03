import api from '../../infrastructure/api'

export const ventasService = {
  // Crear venta
  crearVenta: async (ventaData) => {
    const response = await api.post('/api/ventas/crear_venta', ventaData)
    return response.data
  },

  // Ver venta específica
  obtenerVenta: async (idVenta) => {
    const response = await api.get(`/api/ventas/ver_venta/${idVenta}`)
    return response.data
  },

  // Listar ventas
  obtenerVentas: async (fechaInicio = null, fechaFin = null) => {
    const params = {}
    if (fechaInicio) params.fecha_inicio = fechaInicio
    if (fechaFin) params.fecha_fin = fechaFin
    
    const response = await api.get('/api/ventas/ver_ventas', { params })
    return response.data
  },

  // Obtener información del ticket actual
  obtenerInfoTicketActual: async () => {
    const response = await api.get('/api/ventas/info_ticket_actual')
    return response.data
  },

  // Procesar pago de venta (para comandas terminadas sin pagar). Opcional: tipo_servicio, propina, descuento.
  procesarPagoVenta: async (idVenta, body) => {
    const response = await api.post(`/api/ventas/procesar_pago/${idVenta}`, body)
    return response.data
  },
}

