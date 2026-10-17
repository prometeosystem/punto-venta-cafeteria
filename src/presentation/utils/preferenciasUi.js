/** Preferencias de UI compartidas en el servidor (todas las tablets). */

export const MODO_RESTAURANTE = 'restaurante'
export const MODO_TIENDA = 'tienda'

export function productoDelModo(producto, modoTienda) {
  const canal = producto?.canal === 'tienda' ? 'tienda' : 'restaurante'
  return canal === (modoTienda ? 'tienda' : 'restaurante')
}

export const RUTAS_SOLO_RESTAURANTE = ['/mesas', '/barista', '/inventario']

const METRICAS_METODO_PAGO = [
  { id: 'conteo_efectivo', label: 'Conteo: efectivo', grupo: 'metodos' },
  { id: 'conteo_tarjeta', label: 'Conteo: tarjeta', grupo: 'metodos' },
  { id: 'conteo_delivery', label: 'Conteo: delivery', grupo: 'metodos' },
  { id: 'conteo_transferencia', label: 'Conteo: transferencia', grupo: 'metodos' },
  { id: 'pct_efectivo', label: '% efectivo', grupo: 'metodos' },
  { id: 'pct_tarjeta', label: '% tarjeta', grupo: 'metodos' },
  { id: 'pct_delivery', label: '% delivery', grupo: 'metodos' },
  { id: 'pct_transferencia', label: '% transferencia', grupo: 'metodos' },
]

export const METRICAS_DASHBOARD = [
  { id: 'ventas_totales', label: 'Ventas totales', grupo: 'basicas' },
  { id: 'descuentos', label: 'Descuentos', grupo: 'basicas' },
  { id: 'propinas', label: 'Propinas', grupo: 'restaurante' },
  { id: 'ticket_promedio', label: 'Ticket promedio', grupo: 'basicas' },
  { id: 'ordenes_activas', label: 'Órdenes activas (cocina)', grupo: 'restaurante' },
  { id: 'productos_vendidos', label: 'Productos vendidos', grupo: 'basicas' },
  { id: 'cantidad_ventas', label: 'Cantidad de ventas', grupo: 'basicas' },
  ...METRICAS_METODO_PAGO,
  { id: 'vs_ayer', label: 'Comparación vs ayer', grupo: 'nuevas' },
  { id: 'ventas_por_hora', label: 'Ventas por hora', grupo: 'nuevas' },
  { id: 'top_productos', label: 'Top productos del día', grupo: 'nuevas' },
  { id: 'stock_critico', label: 'Insumos en stock crítico', grupo: 'nuevas' },
  { id: 'margen_estimado', label: 'Margen / utilidad estimada', grupo: 'nuevas' },
  { id: 'cancelaciones', label: 'Cancelaciones del día', grupo: 'nuevas' },
  { id: 'grafico_semana', label: 'Gráfico: ventas de la semana', grupo: 'graficos' },
  { id: 'grafico_metodos', label: 'Panel: productos más vendidos', grupo: 'graficos' },
]

export const METRICAS_REPORTES = [
  { id: 'ventas_totales', label: 'Ventas totales', grupo: 'basicas' },
  { id: 'descuentos', label: 'Descuentos', grupo: 'basicas' },
  { id: 'propinas', label: 'Propinas', grupo: 'restaurante' },
  { id: 'ticket_promedio', label: 'Ticket promedio', grupo: 'basicas' },
  { id: 'productos_vendidos', label: 'Productos vendidos', grupo: 'basicas' },
  { id: 'cantidad_ventas', label: 'Cantidad de ventas', grupo: 'basicas' },
  ...METRICAS_METODO_PAGO,
  { id: 'vs_ayer', label: 'Comparación vs periodo anterior', grupo: 'nuevas' },
  { id: 'ventas_por_hora', label: 'Ventas por hora', grupo: 'nuevas' },
  { id: 'top_productos', label: 'Top productos', grupo: 'nuevas' },
  { id: 'stock_critico', label: 'Insumos en stock crítico', grupo: 'nuevas' },
  { id: 'margen_estimado', label: 'Margen / utilidad estimada', grupo: 'nuevas' },
  { id: 'cancelaciones', label: 'Cancelaciones', grupo: 'nuevas' },
  { id: 'grafico_dias', label: 'Gráfico: ventas por día', grupo: 'graficos' },
  { id: 'grafico_productos', label: 'Gráfico: productos más vendidos', grupo: 'graficos' },
  { id: 'grafico_menos_vendidos', label: 'Lista: productos menos vendidos', grupo: 'graficos' },
  { id: 'grafico_metodos', label: 'Gráfico: ventas por método de pago', grupo: 'graficos' },
]

const METRICAS_OFF_POR_DEFECTO = [
  'vs_ayer',
  'ventas_por_hora',
  'top_productos',
  'stock_critico',
  'margen_estimado',
  'cancelaciones',
  'pct_efectivo',
  'pct_tarjeta',
  'pct_delivery',
  'pct_transferencia',
  'conteo_transferencia',
]

const METRICAS_DASHBOARD_DEFAULT = Object.fromEntries(
  METRICAS_DASHBOARD.map((m) => [m.id, !METRICAS_OFF_POR_DEFECTO.includes(m.id)])
)

const METRICAS_REPORTES_DEFAULT = Object.fromEntries(
  METRICAS_REPORTES.map((m) => [m.id, !METRICAS_OFF_POR_DEFECTO.includes(m.id)])
)

/** Si quedó el check viejo agrupado, lo reparte en los checks por método. */
function migrarMetricasMetodo(mapa) {
  if (!mapa || typeof mapa !== 'object') return {}
  const out = { ...mapa }
  if ('metodos_pago' in out) {
    const on = !!out.metodos_pago
    for (const id of ['conteo_efectivo', 'conteo_tarjeta', 'conteo_delivery', 'conteo_transferencia']) {
      if (!(id in out)) out[id] = on
    }
    delete out.metodos_pago
  }
  if ('pct_metodos_pago' in out) {
    const on = !!out.pct_metodos_pago
    for (const id of ['pct_efectivo', 'pct_tarjeta', 'pct_delivery', 'pct_transferencia']) {
      if (!(id in out)) out[id] = on
    }
    delete out.pct_metodos_pago
  }
  return out
}

export const PREFERENCIAS_DEFAULT = {
  modo: MODO_RESTAURANTE,
  metodos_pago: {
    efectivo: true,
    tarjeta: true,
    delivery: true,
    transferencia: false,
  },
  metricas_dashboard: METRICAS_DASHBOARD_DEFAULT,
  metricas_reportes: METRICAS_REPORTES_DEFAULT,
}

export function esModoTienda(prefs) {
  return (prefs?.modo || MODO_RESTAURANTE) === MODO_TIENDA
}

export function esModoRestaurante(prefs) {
  return !esModoTienda(prefs)
}

export function fusionarPreferencias(parcial) {
  const datos = parcial && typeof parcial === 'object' ? parcial : {}
  return {
    modo: datos.modo === MODO_TIENDA ? MODO_TIENDA : MODO_RESTAURANTE,
    metodos_pago: { ...PREFERENCIAS_DEFAULT.metodos_pago, ...(datos.metodos_pago || {}) },
    metricas_dashboard: {
      ...PREFERENCIAS_DEFAULT.metricas_dashboard,
      ...migrarMetricasMetodo(datos.metricas_dashboard),
    },
    metricas_reportes: {
      ...PREFERENCIAS_DEFAULT.metricas_reportes,
      ...migrarMetricasMetodo(datos.metricas_reportes),
    },
  }
}

/** En modo tienda estas métricas no aplican aunque estén activas. */
export function metricaVisible(prefs, seccion, id) {
  const mapa = seccion === 'reportes' ? prefs?.metricas_reportes : prefs?.metricas_dashboard
  const valor = mapa?.[id]
  const visible = valor === undefined ? !METRICAS_OFF_POR_DEFECTO.includes(id) : !!valor
  if (!visible) return false
  if (esModoTienda(prefs) && (id === 'propinas' || id === 'ordenes_activas' || id === 'stock_critico')) return false
  return true
}
