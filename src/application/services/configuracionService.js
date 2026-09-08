import api from '../../infrastructure/api'

export const configuracionService = {
  // Desde qué porcentaje de descuento se pide autorización.
  obtenerEstadoAutorizacion: async () => {
    const response = await api.get('/api/configuracion/autorizacion')
    return response.data
  },

  // Valida el código de acceso de un administrador. Lanza si no es válido.
  verificarAutorizacion: async (autorizacion) => {
    const response = await api.post('/api/configuracion/autorizacion/verificar', { autorizacion })
    return response.data
  },
}
