/** Frecuencia de visita / entrega de proveedores (valor persistido en dias_visita). */

export const FRECUENCIAS_VISITA = [
  { value: 'cada_dia', label: 'Cada día' },
  { value: 'cada_2_dias', label: 'Cada 2 días' },
  { value: 'cada_3_dias', label: 'Cada 3 días' },
  { value: 'cada_semana', label: 'Cada semana' },
  { value: 'cada_15_dias', label: 'Cada 15 días' },
  { value: 'cada_mes', label: 'Cada mes' },
  { value: 'dias_fijos', label: 'Días fijos de la semana' },
]

export const DIAS_SEMANA = [
  { id: 'lun', label: 'Lun' },
  { id: 'mar', label: 'Mar' },
  { id: 'mie', label: 'Mié' },
  { id: 'jue', label: 'Jue' },
  { id: 'vie', label: 'Vie' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
]

export const OPCIONES_ENTREGA = [
  { value: '0', label: 'Mismo día' },
  { value: '1', label: '1 día' },
  { value: '2', label: '2 días' },
  { value: '3', label: '3 días' },
  { value: '5', label: '5 días' },
  { value: '7', label: '1 semana' },
  { value: '15', label: '15 días' },
  { value: '30', label: '1 mes' },
]

/** Parsea dias_visita guardado → { modo, dias[] } */
export function parseDiasVisita(valor) {
  const raw = (valor || '').trim()
  if (!raw) return { modo: '', dias: [] }
  if (raw.startsWith('dias:')) {
    return {
      modo: 'dias_fijos',
      dias: raw.slice(5).split(',').map((d) => d.trim()).filter(Boolean),
    }
  }
  if (FRECUENCIAS_VISITA.some((f) => f.value === raw)) {
    return { modo: raw, dias: [] }
  }
  // Texto libre antiguo: se muestra como custom
  return { modo: '', dias: [], legacy: raw }
}

export function serializarDiasVisita(modo, dias = []) {
  if (!modo) return null
  if (modo === 'dias_fijos') {
    const limpios = DIAS_SEMANA.map((d) => d.id).filter((id) => dias.includes(id))
    if (!limpios.length) return null
    return `dias:${limpios.join(',')}`
  }
  return modo
}

export function etiquetaDiasVisita(valor) {
  const parsed = parseDiasVisita(valor)
  if (parsed.legacy) return parsed.legacy
  if (parsed.modo === 'dias_fijos') {
    const labels = DIAS_SEMANA.filter((d) => parsed.dias.includes(d.id)).map((d) => d.label)
    return labels.length ? labels.join(', ') : '—'
  }
  return FRECUENCIAS_VISITA.find((f) => f.value === parsed.modo)?.label || valor || '—'
}

export function etiquetaEntrega(dias) {
  if (dias === null || dias === undefined || dias === '') return '—'
  const found = OPCIONES_ENTREGA.find((o) => o.value === String(dias))
  return found ? found.label : `${dias} días`
}
