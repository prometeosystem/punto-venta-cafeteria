import api from '../../infrastructure/api'

export const cajaService = {
  async abrirCaja(data) {
    const response = await api.post('/api/caja/abrir_caja', data)
    return response.data
  },

  async obtenerCajaActual() {
    const response = await api.get('/api/caja/caja_actual')
    return response.data
  },

  async cerrarCaja(idSesion, data) {
    const response = await api.post(`/api/caja/cerrar_caja/${idSesion}`, data)
    return response.data
  },

  async listarSesiones(filtros = {}) {
    const params = new URLSearchParams()
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.append(k, v) })
    const response = await api.get(`/api/caja/ver_sesiones?${params}`)
    return response.data
  },

  async verSesion(idSesion) {
    const response = await api.get(`/api/caja/ver_sesion/${idSesion}`)
    return response.data
  },

  async obtenerFondoDefault() {
    const response = await api.get('/api/caja/fondo_default')
    return response.data
  },
}
