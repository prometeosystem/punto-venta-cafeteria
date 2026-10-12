import { History } from 'lucide-react'
import { servicioDe } from '../utils/tipoServicio'

const formatHora = (fechaString) => {
  if (!fechaString) return ''
  return new Date(fechaString).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const notasDetalle = (detalle) =>
  [
    detalle.tipo_preparacion === 'heladas' && 'Frío',
    detalle.tipo_preparacion === 'frapeadas' && 'Frapeada',
    ...(detalle.observaciones ? detalle.observaciones.split(' - ') : []).filter(
      (obs) => !(detalle.tipo_preparacion && obs.startsWith('Preparación:'))
    ),
  ].filter(Boolean)

const ComandaEntregada = ({ comanda }) => {
  const servicio = servicioDe(comanda.pedido?.tipo_servicio, comanda.pedido?.metodo_pago)
  const pagoConocido = comanda.venta_pagada !== undefined && comanda.venta_pagada !== null
  const sinPagar = comanda.venta_pagada === 0 || comanda.venta_pagada === false
  const comentarios = comanda.pedido?.comentarios

  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <span className="shrink-0 bg-gray-100 text-gray-700 rounded-md w-8 h-8 flex items-center justify-center text-sm font-bold">
          {comanda.numero_dia ?? comanda.id_comanda}
        </span>
        <p className="flex-1 min-w-0 flex items-baseline gap-1.5">
          <span className="text-sm font-medium text-gray-900 truncate">
            {comanda.pedido?.nombre_cliente || comanda.venta_nombre_cliente || 'Sin nombre'}
          </span>
          <span className="shrink-0 text-[11px] text-gray-500 tabular-nums">
            {formatHora(comanda.fecha_creacion || comanda.fecha_venta)}
          </span>
        </p>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {servicio && (
            <span className={`text-[10px] font-bold tracking-wide uppercase leading-none ${servicio.color}`}>
              {servicio.texto}
            </span>
          )}
          {pagoConocido && (
            <span
              className={`text-[10px] font-bold tracking-wide uppercase leading-none ${
                sinPagar ? 'text-red-700' : 'text-matcha-700'
              }`}
            >
              {sinPagar ? 'Sin pagar' : 'Pagado'}
            </span>
          )}
        </div>
      </div>

      <ul className="mt-1.5 pl-[2.625rem] space-y-1">
        {comanda.detalles?.map((detalle) => {
          const notas = notasDetalle(detalle)
          return (
            <li key={detalle.id_detalle_comanda} className="text-xs leading-snug">
              <span className="font-semibold tabular-nums text-gray-700">{detalle.cantidad}</span>{' '}
              <span className="text-gray-800">
                {detalle.producto_nombre || detalle.nombre_producto || `Producto #${detalle.id_producto}`}
              </span>
              {notas.length > 0 && (
                <span className="block text-[11px] text-gray-500">{notas.join(' · ')}</span>
              )}
            </li>
          )
        })}
      </ul>

      {comentarios && (
        <p className="mt-1.5 ml-[2.625rem] px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-[11px] text-yellow-800 italic">
          {comentarios}
        </p>
      )}
    </li>
  )
}

const HistorialComandas = ({ comandas }) => (
  <aside className="card !p-0 flex flex-col min-h-0 lg:w-80 xl:w-96 shrink-0 max-h-[60dvh] lg:max-h-none">
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
      <History className="w-4 h-4 text-gray-500" />
      <h2 className="text-sm font-semibold text-gray-800">Entregadas hoy</h2>
      <span className="ml-auto text-xs text-gray-500 tabular-nums">{comandas.length}</span>
    </div>

    {comandas.length === 0 ? (
      <p className="px-3 py-8 text-center text-sm text-gray-400">Aún no hay comandas entregadas</p>
    ) : (
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-100">
        {comandas.map((comanda) => (
          <ComandaEntregada key={comanda.id_comanda} comanda={comanda} />
        ))}
      </ul>
    )}
  </aside>
)

export default HistorialComandas
