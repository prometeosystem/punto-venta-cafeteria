import api from '../../infrastructure/api'

export const reportesService = {
  // Obtener ventas por día
  obtenerVentasPorDia: async (fechaInicio, fechaFin) => {
    const response = await api.get('/api/reportes/ventas_por_dia', {
      params: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      }
    })
    return response.data
  },

  // Obtener productos más vendidos
  obtenerProductosMasVendidos: async (fechaInicio, fechaFin, limite = 10) => {
    const response = await api.get('/api/reportes/productos_mas_vendidos', {
      params: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        limite: limite
      }
    })
    return response.data
  },

  // Obtener recomendaciones de compra
  obtenerComprasRecomendadas: async (mesesAnalisis = 3) => {
    const response = await api.get('/api/reportes/compras_recomendadas', {
      params: {
        meses_analisis: mesesAnalisis
      }
    })
    return response.data
  }
}

