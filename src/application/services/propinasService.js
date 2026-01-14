import api from '../../infrastructure/api'

export const propinasService = {
  // Registrar propina
  registrarPropina: async (propinaData) => {
    const response = await api.post('/api/propinas/', propinaData)
    return response.data
  },
}
