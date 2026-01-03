import api from '../../infrastructure/api'

export const clientesService = {
  // Crear cliente (público)
  crearCliente: async (clienteData) => {
    const response = await api.post('/api/clientes/crear_cliente', clienteData)
    return response.data
  },

  // Listar clientes
  obtenerClientes: async () => {
    const response = await api.get('/api/clientes/ver_clientes')
    return response.data
  },

  // Ver cliente específico
  obtenerCliente: async (idCliente) => {
    const response = await api.get(`/api/clientes/ver_cliente/${idCliente}`)
    return response.data
  },

  // Editar cliente
  editarCliente: async (idCliente, clienteData) => {
    const response = await api.put(`/api/clientes/editar_cliente/${idCliente}`, clienteData)
    return response.data
  },

  // Registrar visita
  registrarVisita: async (visitaData) => {
    const response = await api.post('/api/clientes/registrar_visita', visitaData)
    return response.data
  },

  // Ver visitas de cliente
  obtenerVisitasCliente: async (idCliente) => {
    const response = await api.get(`/api/clientes/visitas_cliente/${idCliente}`)
    return response.data
  },

  // Contar visitas de cliente
  contarVisitasCliente: async (idCliente) => {
    const response = await api.get(`/api/clientes/contar_visitas_cliente/${idCliente}`)
    return response.data
  },
}

