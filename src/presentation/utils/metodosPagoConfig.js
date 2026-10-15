import { clave } from './almacenLocal'

const STORAGE_KEY = clave('metodos_pago')

export const METODOS_PAGO_DISPONIBLES = [
  { id: 'efectivo', label: 'Efectivo', boton: '$ Efectivo', icono: 'efectivo' },
  { id: 'tarjeta', label: 'Tarjeta', boton: 'Tarjeta', icono: 'tarjeta' },
  { id: 'delivery', label: 'Delivery', boton: 'Delivery', icono: 'delivery' },
  { id: 'transferencia', label: 'Transferencia Bancaria', boton: 'Transferencia', icono: 'transferencia' },
]

const DEFAULTS = {
  efectivo: true,
  tarjeta: true,
  delivery: true,
  transferencia: false,
}

/** Copia local rápida; la fuente de verdad es el servidor (preferencias_ui). */
export function obtenerMetodosPagoConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return { ...DEFAULTS, ...parsed }
  } catch {
    return { ...DEFAULTS }
  }
}

export function sincronizarMetodosPagoDesdeServidor(config) {
  const next = { ...DEFAULTS, ...(config || {}) }
  if (!Object.values(next).some(Boolean)) next.efectivo = true
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('metodos-pago-config-changed', { detail: next }))
  return next
}

export function guardarMetodosPagoConfig(config) {
  return sincronizarMetodosPagoDesdeServidor(config)
}

export function obtenerMetodosPagoActivos() {
  const config = obtenerMetodosPagoConfig()
  return METODOS_PAGO_DISPONIBLES.filter((m) => config[m.id])
}
