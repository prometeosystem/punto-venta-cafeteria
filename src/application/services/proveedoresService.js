import api from '../../infrastructure/api'

export const proveedoresService = {
  listar: async (todos = false) => {
    const response = await api.get('/api/proveedores', { params: { todos } })
    return response.data
  },

  obtener: async (id) => {
    const response = await api.get(`/api/proveedores/${id}`)
    return response.data
  },

  crear: async (data) => {
    const response = await api.post('/api/proveedores', data)
    return response.data
  },

  editar: async (id, data) => {
    const response = await api.put(`/api/proveedores/${id}`, data)
    return response.data
  },

  agregarItem: async (idProveedor, data) => {
    const response = await api.post(`/api/proveedores/${idProveedor}/items`, data)
    return response.data
  },

  quitarItem: async (idProveedorItem) => {
    const response = await api.delete(`/api/proveedores/items/${idProveedorItem}`)
    return response.data
  },

  porComprar: async (idProveedor = null) => {
    const params = idProveedor ? { id_proveedor: idProveedor } : {}
    const response = await api.get('/api/proveedores/por_comprar', { params })
    return response.data
  },

  historial: async (idProveedor) => {
    const response = await api.get(`/api/proveedores/${idProveedor}/historial`)
    return response.data
  },

  recibirCompra: async (data) => {
    const response = await api.post('/api/proveedores/compras/recibir', data)
    return response.data
  },

  proveedoresDeItem: async (tipoItem, idItem) => {
    const response = await api.get(`/api/proveedores/item/${tipoItem}/${idItem}`)
    return response.data
  },

  sincronizarItem: async (tipoItem, idItem, vinculos) => {
    const response = await api.put(`/api/proveedores/item/${tipoItem}/${idItem}`, {
      vinculos: (vinculos || []).map((v) => ({
        id_proveedor: Number(v.id_proveedor),
        precio_compra: v.precio_compra === '' || v.precio_compra == null ? null : Number(v.precio_compra),
        codigo_proveedor: v.codigo_proveedor || null,
        es_preferido: !!v.es_preferido,
      })),
    })
    return response.data
  },
}
