import { useState } from 'react'
import { ArrowLeft, Printer, Send } from 'lucide-react'
import { itemsDesdeCarrito } from '../utils/imprimirTicket'
import { repartirProporcional } from '../utils/cuentaTicket'

const OPCIONES_PERSONAS = [2, 3, 4, 5, 6]
const MAX_PERSONAS = 20

// Clases completas para que Tailwind las incluya; se repiten a partir de la 5.ª persona.
const COLORES = [
  { solido: 'bg-blue-500 border-blue-500', suave: 'bg-blue-50 border-blue-500', texto: 'text-blue-700' },
  { solido: 'bg-amber-500 border-amber-500', suave: 'bg-amber-50 border-amber-500', texto: 'text-amber-700' },
  { solido: 'bg-purple-500 border-purple-500', suave: 'bg-purple-50 border-purple-500', texto: 'text-purple-700' },
  { solido: 'bg-red-500 border-red-500', suave: 'bg-red-50 border-red-500', texto: 'text-red-700' },
]
const colorDe = (persona) => COLORES[persona % COLORES.length]

const money = (n) => `$${(Number(n) || 0).toFixed(2)}`

/**
 * Divide la cuenta de la orden en pantalla: se elige una persona y se tocan
 * los productos (unidad por unidad) que le tocan pagar.
 *
 * `cuenta` trae lo que ya calcula el punto de venta: items del carrito,
 * subtotal, descuento, propina, total y `precioUnitario(item)` con extras.
 */
const DividirCuentaModal = ({ cuenta, onImprimir, onClose, textoAccion = 'Imprimir cuenta' }) => {
  const [forma, setForma] = useState(null)
  const [personas, setPersonas] = useState(2)
  const [otraCantidad, setOtraCantidad] = useState('')
  const [personaActiva, setPersonaActiva] = useState(0)
  const [asignacion, setAsignacion] = useState({})

  // Un renglón por unidad: tres cafés se pueden repartir entre tres personas
  const renglones = cuenta.items.flatMap((item, indice) => {
    const [info] = itemsDesdeCarrito([{ ...item, quantity: 1 }])
    return Array.from({ length: Number(item.quantity) || 1 }, (_, u) => ({
      clave: `${indice}-${u}`,
      indice,
      nombre: info.nombre,
      notas: info.observaciones,
      precio: cuenta.precioUnitario(item),
    }))
  })

  const unidades = [...renglones].sort((a, b) => {
    const porNombre = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    if (porNombre !== 0) return porNombre
    return (a.notas || '').localeCompare(b.notas || '', 'es', { sensitivity: 'base' })
  })

  const cambiarPersonas = (n) => {
    setPersonas(n)
    if (personaActiva >= n) setPersonaActiva(0)
    // Quien ya no existe pierde sus productos
    setAsignacion((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([, persona]) => persona < n))
    )
  }

  const tocarProducto = (clave) =>
    setAsignacion((prev) => {
      const siguiente = { ...prev }
      if (siguiente[clave] === personaActiva) delete siguiente[clave]
      else siguiente[clave] = personaActiva
      return siguiente
    })

  const asignarRestantes = () =>
    setAsignacion((prev) => {
      const siguiente = { ...prev }
      unidades.forEach((u) => {
        if (siguiente[u.clave] === undefined) siguiente[u.clave] = personaActiva
      })
      return siguiente
    })

  const subtotalesPorPersona = Array.from({ length: personas }, (_, p) =>
    unidades.filter((u) => asignacion[u.clave] === p).reduce((sum, u) => sum + u.precio, 0)
  )
  const conteoPorPersona = Array.from({ length: personas }, (_, p) =>
    unidades.filter((u) => asignacion[u.clave] === p).length
  )
  const sinAsignar = unidades.filter((u) => asignacion[u.clave] === undefined).length

  const armarCuentasPorProductos = () => {
    const activas = subtotalesPorPersona
      .map((subtotal, persona) => ({ persona, subtotal }))
      .filter(({ subtotal }) => subtotal > 0)
    const pesos = activas.map(({ subtotal }) => subtotal)
    const descuentos = repartirProporcional(cuenta.descuento, pesos)
    const propinas = repartirProporcional(cuenta.propina, pesos)

    return activas.map(({ persona, subtotal }, i) => {
      const conteo = {}
      unidades
        .filter((u) => asignacion[u.clave] === persona)
        .forEach((u) => {
          conteo[u.indice] = (conteo[u.indice] || 0) + 1
        })
      const items = itemsDesdeCarrito(
        Object.entries(conteo).map(([indice, cantidad]) => ({ ...cuenta.items[indice], quantity: cantidad }))
      )
      return {
        items,
        subtotal,
        descuento: descuentos[i],
        propina: propinas[i],
        total: subtotal - descuentos[i] + propinas[i],
      }
    })
  }

  const partesIguales = repartirProporcional(
    cuenta.total,
    Array.from({ length: personas }, () => 1)
  )

  const imprimir = () => {
    if (forma === 'iguales') {
      onImprimir({ modo: 'iguales', partes: partesIguales.map((total) => ({ total })) })
      return
    }
    onImprimir({ modo: 'productos', cuentas: armarCuentasPorProductos() })
  }

  const puedeImprimir = forma === 'iguales' || (sinAsignar === 0 && unidades.length > 0)
  const esOtra = !OPCIONES_PERSONAS.includes(personas)
  const colorActivo = colorDe(personaActiva)
  const cantidadPorPersona = partesIguales[0] || 0
  const partesDistintas = partesIguales.some((total) => total !== cantidadPorPersona)

  const volver = (
    <button
      type="button"
      onClick={() => setForma(null)}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver
    </button>
  )

  const selectorPersonas = (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-2">¿Entre cuántas personas?</p>
      <div className="flex flex-wrap gap-2">
        {OPCIONES_PERSONAS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setOtraCantidad('')
              cambiarPersonas(n)
            }}
            className={`w-12 h-12 rounded-lg border-2 text-lg font-semibold transition-colors ${
              personas === n && !otraCantidad
                ? 'border-marca-500 bg-marca-50 text-marca-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {n}
          </button>
        ))}
        <input
          type="number"
          inputMode="numeric"
          min="2"
          max={MAX_PERSONAS}
          placeholder="Otro"
          value={otraCantidad}
          onChange={(e) => {
            setOtraCantidad(e.target.value)
            const n = parseInt(e.target.value, 10)
            if (n >= 2 && n <= MAX_PERSONAS) cambiarPersonas(n)
          }}
          className={`w-20 h-12 px-2 rounded-lg border-2 text-center text-lg font-semibold focus:outline-none ${
            esOtra || otraCantidad ? 'border-marca-500 bg-marca-50 text-marca-700' : 'border-gray-200'
          }`}
        />
      </div>
    </div>
  )

  const acciones = (
    <div className="px-5 py-4 border-t border-gray-200 flex gap-3">
      <button onClick={onClose} className="btn-outline flex-1">
        Cancelar
      </button>
      <button
        onClick={imprimir}
        disabled={!puedeImprimir}
        className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {textoAccion === 'Imprimir cuenta' ? <Printer className="w-5 h-5" /> : <Send className="w-5 h-5" />}
        {textoAccion}
      </button>
    </div>
  )

  if (!forma) {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titulo-dividir"
        >
          <div className="px-5 py-4 space-y-3">
            <h2 id="titulo-dividir" className="text-lg font-semibold text-gray-900">
              ¿Cómo se divide la cuenta?
            </h2>
            <button
              type="button"
              onClick={() => setForma('iguales')}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-marca-500 hover:bg-marca-50"
            >
              <span className="block text-base font-semibold text-gray-900">En partes iguales</span>
              <span className="block text-sm text-gray-500">El total se reparte entre las personas</span>
            </button>
            <button
              type="button"
              onClick={() => setForma('productos')}
              className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-left transition-colors hover:border-marca-500 hover:bg-marca-50"
            >
              <span className="block text-base font-semibold text-gray-900">Por productos</span>
              <span className="block text-sm text-gray-500">Cada quien paga lo que pidió</span>
            </button>
          </div>
          <div className="px-5 py-4 border-t border-gray-200">
            <button onClick={onClose} className="btn-outline w-full">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (forma === 'iguales') {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90dvh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
            {volver}
            {selectorPersonas}
            <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-gray-600">Cantidad por persona</span>
                <span className="tabular-nums font-semibold text-gray-900">{money(cantidadPorPersona)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2">
                <span className="font-medium text-gray-900">Total</span>
                <span className="tabular-nums text-lg font-bold text-gray-900">{money(cuenta.total)}</span>
              </div>
              {partesDistintas && (
                <p className="text-xs text-gray-500">
                  Los centavos que sobran quedan en las primeras partes.
                </p>
              )}
            </div>
          </div>
          {acciones}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg md:max-w-3xl w-full max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {volver}
          {selectorPersonas}

          <div>
            <p className="text-xs text-gray-500 mb-2">Elige una persona y toca lo que pidió.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {subtotalesPorPersona.map((subtotal, p) => {
                const color = colorDe(p)
                const activa = p === personaActiva
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPersonaActiva(p)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                      activa ? color.suave : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center text-sm font-bold text-white ${color.solido}`}
                    >
                      {p + 1}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold ${activa ? color.texto : 'text-gray-900'}`}>
                        Persona {p + 1}
                      </span>
                      <span className="block text-xs text-gray-500 tabular-nums">
                        {money(subtotal)} · {conteoPorPersona[p]} {conteoPorPersona[p] === 1 ? 'producto' : 'productos'}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">Productos</p>
              {sinAsignar > 0 && (
                <button
                  type="button"
                  onClick={asignarRestantes}
                  className={`text-xs font-semibold underline-offset-2 hover:underline ${colorActivo.texto}`}
                >
                  Asignar lo que falta a Persona {personaActiva + 1}
                </button>
              )}
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {unidades.map((u) => {
                const asignadaA = asignacion[u.clave]
                const color = asignadaA !== undefined ? colorDe(asignadaA) : null
                return (
                  <li key={u.clave}>
                    <button
                      type="button"
                      onClick={() => tocarProducto(u.clave)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 text-left transition-colors active:scale-[0.99] ${
                        color ? color.suave : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-xs font-bold ${
                          color ? `${color.solido} text-white` : 'border-2 border-dashed border-gray-300 text-gray-300'
                        }`}
                      >
                        {asignadaA !== undefined ? asignadaA + 1 : ''}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-gray-900">{u.nombre}</span>
                        {u.notas && <span className="block text-[11px] text-gray-500">{u.notas}</span>}
                      </span>
                      <span className="text-sm tabular-nums text-gray-700 shrink-0">{money(u.precio)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {(cuenta.descuento > 0 || cuenta.propina > 0) && (
              <p className="text-[11px] text-gray-500">
                El descuento y la propina se reparten según lo que consume cada quien.
              </p>
            )}
            {sinAsignar > 0 && (
              <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                {sinAsignar === 1 ? 'Falta 1 producto por asignar' : `Faltan ${sinAsignar} productos por asignar`}
              </p>
            )}
          </div>
        </div>

        {acciones}
      </div>
    </div>
  )
}

export default DividirCuentaModal
