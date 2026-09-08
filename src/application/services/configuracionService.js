import api from '../../infrastructure/api'

export const configuracionService = {
  // Indica si ya hay un código definido y desde qué descuento se pide
  // autorización. Nunca devuelve el código.
  obtenerEstadoAutorizacion: async () => {
    const response = await api.get('/api/configuracion/autorizacion')
    return response.data
  },

  // Solo administradores. El código se guarda hasheado en el backend.
  definirCodigoAutorizacion: async (codigo) => {
    const response = await api.put('/api/configuracion/autorizacion', { codigo })
    return response.data
  },

  // Valida un código o la contraseña de un administrador. Lanza si no es válido.
  verificarAutorizacion: async (autorizacion) => {
    const response = await api.post('/api/configuracion/autorizacion/verificar', { autorizacion })
    return response.data
  },
}
