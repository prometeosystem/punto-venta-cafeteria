/** Una lista vacía significa que no hay comandas. Otra cosa es un fallo de carga. */
export function comoLista(data) {
  if (Array.isArray(data)) return data
  const detalle = data && (data.error || data.detail)
  const texto = typeof detalle === 'string' ? detalle : ''
  throw new Error(texto || 'No se pudieron cargar las comandas')
}

/** El aviso solo corresponde a la carga inicial. Un refresco no debe tapar la pantalla. */
export function debeAvisarErrorDeCarga(esRefresh) {
  return !esRefresh
}

export function mensajeCargaComandas(error) {
  const detalle = error?.response?.data?.detail
  if (typeof detalle === 'string' && detalle) return detalle
  if (typeof error?.message === 'string' && error.message) return error.message
  return 'No se pudieron cargar las comandas'
}
