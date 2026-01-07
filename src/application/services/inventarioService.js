import api from '../../infrastructure/api'

export const inventarioService = {
  // Crear insumo
  crearInsumo: async (insumoData) => {
    const response = await api.post('/api/inventario/crear_insumo', insumoData)
    return response.data
  },

  // Listar insumos
  obtenerInsumos: async () => {
    const response = await api.get('/api/inventario/ver_insumos')
    return response.data
  },

  // Ver insumo específico
  obtenerInsumo: async (idInsumo) => {
    const response = await api.get(`/api/inventario/ver_insumo/${idInsumo}`)
    return response.data
  },

  // Editar insumo
  editarInsumo: async (idInsumo, insumoData) => {
    const response = await api.put(`/api/inventario/editar_insumo/${idInsumo}`, insumoData)
    return response.data
  },

  // Registrar movimiento de inventario
  registrarMovimiento: async (movimientoData) => {
    const response = await api.post('/api/inventario/registrar_movimiento', movimientoData)
    return response.data
  },

  // Insumos bajo stock
  obtenerInsumosBajoStock: async () => {
    const response = await api.get('/api/inventario/insumos_bajo_stock')
    return response.data
  },
}



