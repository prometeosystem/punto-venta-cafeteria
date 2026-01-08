import api from '../../infrastructure/api'

export const recetasService = {
  // Crear receta
  crearReceta: async (recetaData) => {
    const response = await api.post('/api/recetas/crear_receta', recetaData)
    return response.data
  },

  // Ver recetas de un producto
  obtenerRecetasProducto: async (idProducto) => {
    const response = await api.get(`/api/recetas/ver_recetas_producto/${idProducto}`)
    return response.data
  },

  // Eliminar receta
  eliminarReceta: async (idReceta) => {
    const response = await api.delete(`/api/recetas/eliminar_receta/${idReceta}`)
    return response.data
  },
}




