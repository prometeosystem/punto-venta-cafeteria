import api from '../../infrastructure/api'

export const movimientoCajaService = {
  async registrarMovimiento(formData) {
    const response = await api.post('/api/movimientos-caja/registrar_movimiento', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  async listarMovimientos(filtros = {}) {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
    const response = await api.get(`/api/movimientos-caja/ver_movimientos?${params}`)
    return response.data
  },

  async verMovimiento(id) {
    const response = await api.get(`/api/movimientos-caja/ver_movimiento/${id}`)
    return response.data
  },

  async listarCategorias() {
    const response = await api.get('/api/categorias-movimiento/ver_categorias')
    return response.data
  },

  async crearCategoria(data) {
    const response = await api.post('/api/categorias-movimiento/crear_categoria', data)
    return response.data
  },

  async editarCategoria(id, data) {
    const response = await api.put(`/api/categorias-movimiento/editar_categoria/${id}`, data)
    return response.data
  },

  async desactivarCategoria(id) {
    const response = await api.delete(`/api/categorias-movimiento/desactivar_categoria/${id}`)
    return response.data
  },
}
