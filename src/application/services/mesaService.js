import api from '../../infrastructure/api'

// Mesas del plano. Cada mesa trae `cuenta` (null si está libre) con la venta
// sin pagar y su comanda más reciente.
export const mesaService = {
  listar: async () => {
    const response = await api.get('/api/mesas/')
    return response.data
  },

  listarSecciones: async () => {
    const response = await api.get('/api/mesas/secciones')
    return response.data
  },

  crearSeccion: async (nombre) => {
    const response = await api.post('/api/mesas/secciones', { nombre })
    return response.data
  },

  crear: async (mesa) => {
    const response = await api.post('/api/mesas/', mesa)
    return response.data
  },

  editar: async (idMesa, cambios) => {
    const response = await api.put(`/api/mesas/${idMesa}`, cambios)
    return response.data
  },

  borrar: async (idMesa) => {
    const response = await api.delete(`/api/mesas/${idMesa}`)
    return response.data
  },

  // posiciones: [{ id_mesa, pos_x, pos_y }]
  guardarPlano: async (posiciones) => {
    const response = await api.put('/api/mesas/plano', { mesas: posiciones })
    return response.data
  },
}
