import api from '../../infrastructure/api'

export const productosService = {
  // Listar productos (público)
  obtenerProductos: async () => {
    const response = await api.get('/api/productos/ver_productos')
    return response.data
  },

  // Ver producto específico
  obtenerProducto: async (idProducto) => {
    const response = await api.get(`/api/productos/ver_producto/${idProducto}`)
    return response.data
  },

  // Crear producto (acepta FormData o JSON)
  crearProducto: async (productoData) => {
    // Si es FormData, no establecer Content-Type (el navegador lo hace automáticamente)
    const config = productoData instanceof FormData 
      ? { headers: { 'Content-Type': undefined } }
      : {}
    const response = await api.post('/api/productos/crear_producto', productoData, config)
    return response.data
  },

  // Editar producto (acepta FormData o JSON)
  editarProducto: async (idProducto, productoData) => {
    // Si es FormData, no establecer Content-Type (el navegador lo hace automáticamente)
    const config = productoData instanceof FormData 
      ? { headers: { 'Content-Type': undefined } }
      : {}
    const response = await api.put(`/api/productos/editar_producto/${idProducto}`, productoData, config)
    return response.data
  },

  // Eliminar producto (desactivar)
  eliminarProducto: async (idProducto) => {
    const response = await api.delete(`/api/productos/eliminar_producto/${idProducto}`)
    return response.data
  },
}

