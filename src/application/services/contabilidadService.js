import api from '../../infrastructure/api'

export const contabilidadService = {
  async resumenDiario(fecha) {
    const params = fecha ? `?fecha=${fecha}` : ''
    const response = await api.get(`/api/contabilidad/resumen_diario${params}`)
    return response.data
  },

  async resumenMensual(anio, mes) {
    const response = await api.get(`/api/contabilidad/resumen_mensual?anio=${anio}&mes=${mes}`)
    return response.data
  },

  async estadoResultados(fechaInicio, fechaFin) {
    const response = await api.get(`/api/contabilidad/estado_resultados?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`)
    return response.data
  },

  async exportarPdf(tipoReporte, params = {}) {
    const qs = new URLSearchParams({ tipo_reporte: tipoReporte, ...params })
    const response = await api.get(`/api/contabilidad/exportar_pdf?${qs}`, { responseType: 'blob' })
    return response.data
  },

  async exportarExcel(tipoReporte, params = {}) {
    const qs = new URLSearchParams({ tipo_reporte: tipoReporte, ...params })
    const response = await api.get(`/api/contabilidad/exportar_excel?${qs}`, { responseType: 'blob' })
    return response.data
  },
}
