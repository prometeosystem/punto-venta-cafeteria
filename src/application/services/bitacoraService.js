import api from '../../infrastructure/api'

export const bitacoraService = {
  // Obtener registros de bitácora con filtros
  obtenerBitacora: async (filtros = {}) => {
    const params = new URLSearchParams()
    
    if (filtros.id_usuario) params.append('id_usuario', filtros.id_usuario)
    if (filtros.modulo) params.append('modulo', filtros.modulo)
    if (filtros.tipo_movimiento) params.append('tipo_movimiento', filtros.tipo_movimiento)
    if (filtros.entidad_tipo) params.append('entidad_tipo', filtros.entidad_tipo)
    if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde)
    if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta)
    if (filtros.limite) params.append('limite', filtros.limite)
    if (filtros.offset) params.append('offset', filtros.offset)
    
    const response = await api.get(`/api/bitacora?${params.toString()}`)
    return response.data
  },

  // Obtener un registro específico por ID
  obtenerBitacoraPorId: async (idBitacora) => {
    const response = await api.get(`/api/bitacora/${idBitacora}`)
    return response.data
  },
}
