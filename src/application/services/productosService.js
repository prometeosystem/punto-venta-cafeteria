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
    // Si es FormData, el interceptor de api.js ya maneja el Content-Type
    // No necesitamos config adicional, axios lo maneja automáticamente
    console.log('[DEBUG SERVICE] Creando producto, es FormData:', productoData instanceof FormData)
    if (productoData instanceof FormData) {
      // Log para debugging (no mostrar datos sensibles)
      console.log('[DEBUG SERVICE] FormData tiene imagen:', productoData.has('imagen'))
    }
    const response = await api.post('/api/productos/crear_producto', productoData)
    return response.data
  },

  // Editar producto (acepta FormData o JSON)
  editarProducto: async (idProducto, productoData) => {
    // Si es FormData, el interceptor de api.js ya maneja el Content-Type
    // No necesitamos config adicional, axios lo maneja automáticamente
    console.log('[DEBUG SERVICE] Editando producto, es FormData:', productoData instanceof FormData)
    if (productoData instanceof FormData) {
      // Log para debugging (no mostrar datos sensibles)
      console.log('[DEBUG SERVICE] FormData tiene imagen:', productoData.has('imagen'))
      console.log('[DEBUG SERVICE] FormData tiene eliminar_imagen:', productoData.has('eliminar_imagen'))
    }
    const response = await api.put(`/api/productos/editar_producto/${idProducto}`, productoData)
    return response.data
  },

  // Eliminar producto (desactivar)
  eliminarProducto: async (idProducto) => {
    const response = await api.delete(`/api/productos/eliminar_producto/${idProducto}`)
    return response.data
  },
}

