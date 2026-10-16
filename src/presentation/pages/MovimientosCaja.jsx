import { useState, useEffect, useMemo } from 'react'
import { movimientoCajaService } from '../../application/services/movimientoCajaService'
import {
  Plus, Loader2, X, ArrowDownLeft, ArrowUpRight, Scale, Search, Inbox, Trash2,
} from 'lucide-react'
import Swal from 'sweetalert2'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

const sanitizeMonto = (raw) => {
  const limpio = String(raw).replace(/[^\d.]/g, '')
  const [entero, ...resto] = limpio.split('.')
  if (resto.length === 0) return entero
  return `${entero}.${resto.join('').slice(0, 2)}`
}

const conSeparadorMiles = (valor) => {
  if (valor === '' || valor == null) return ''
  const [entero, decimales] = String(valor).split('.')
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimales !== undefined ? `${enteroFormateado}.${decimales}` : enteroFormateado
}

const formInicial = { tipo: 'salida', id_categoria_movimiento: '', monto: '', concepto: '', proveedor: '' }

const FILTROS_TIPO = [
  { id: 'todos', label: 'Todos' },
  { id: 'entrada', label: 'Entradas' },
  { id: 'salida', label: 'Salidas' },
]

const claveDia = (fecha) => {
  const d = new Date(fecha)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

const etiquetaDia = (fecha) => {
  const d = new Date(fecha)
  const hoy = new Date()
  const ayer = new Date()
  ayer.setDate(hoy.getDate() - 1)
  if (claveDia(d) === claveDia(hoy)) return 'Hoy'
  if (claveDia(d) === claveDia(ayer)) return 'Ayer'
  const texto = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const horaCorta = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

const TarjetaResumen = ({ icono: Icono, etiqueta, monto, detalle, tono, colorMonto = 'text-gray-900' }) => {
  const tonos = {
    entrada: 'bg-marca-100 text-marca-700',
    salida: 'bg-red-100 text-red-700',
    neto: 'bg-gray-100 text-gray-700',
  }
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${tonos[tono]}`}>
          <Icono className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <p className="truncate text-xs font-medium text-gray-500 sm:text-sm">{etiqueta}</p>
      </div>
      <p className={`mt-2 truncate text-lg font-bold leading-tight tabular-nums sm:text-2xl ${colorMonto}`}>{monto}</p>
      {detalle && <p className="mt-0.5 truncate text-[11px] text-gray-400 sm:text-xs">{detalle}</p>}
    </div>
  )
}

const MovimientosCaja = () => {
  const [movimientos, setMovimientos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [form, setForm] = useState(formInicial)
  const [detalles, setDetalles] = useState([])
  const [totales, setTotales] = useState({ entradas: 0, salidas: 0, neto: 0 })
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  const cargar = async () => {
    setLoading(true)
    try {
      const [movData, catData] = await Promise.all([
        movimientoCajaService.listarMovimientos(),
        movimientoCajaService.listarCategorias(),
      ])
      setMovimientos(movData.movimientos || [])
      setTotales({ entradas: movData.total_entradas, salidas: movData.total_salidas, neto: movData.neto })
      setCategorias(catData.categorias || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  const conteo = useMemo(() => ({
    entrada: movimientos.filter((m) => m.tipo === 'entrada').length,
    salida: movimientos.filter((m) => m.tipo === 'salida').length,
  }), [movimientos])

  const grupos = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const visibles = movimientos.filter((m) => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (!texto) return true
      return [m.concepto, m.categoria_nombre, m.proveedor, m.nombre_usuario]
        .some((campo) => String(campo || '').toLowerCase().includes(texto))
    })
    const porDia = new Map()
    visibles.forEach((m) => {
      const clave = claveDia(m.fecha_movimiento)
      if (!porDia.has(clave)) porDia.set(clave, { etiqueta: etiquetaDia(m.fecha_movimiento), items: [], neto: 0 })
      const grupo = porDia.get(clave)
      grupo.items.push(m)
      grupo.neto += (m.tipo === 'entrada' ? 1 : -1) * Number(m.monto || 0)
    })
    return [...porDia.values()]
  }, [movimientos, filtroTipo, busqueda])

  const cerrarModal = () => {
    setShowModal(false)
    setForm(formInicial)
    setDetalles([])
  }

  const abrirModal = () => {
    setForm(formInicial)
    setDetalles([])
    setShowModal(true)
  }

  const recalcularMonto = (nuevos) => {
    const suma = nuevos.reduce((acc, d) => acc + (d.subtotal || 0), 0)
    if (suma > 0) setForm((prev) => ({ ...prev, monto: suma.toFixed(2) }))
  }

  const agregarDetalle = () => {
    setDetalles([...detalles, { descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }])
  }

  const quitarDetalle = (index) => {
    const nuevos = detalles.filter((_, i) => i !== index)
    setDetalles(nuevos)
    recalcularMonto(nuevos)
  }

  const actualizarDetalle = (index, field, value) => {
    const nuevos = [...detalles]
    nuevos[index][field] = value
    if (field === 'cantidad' || field === 'precio_unitario') {
      nuevos[index].subtotal = parseFloat(nuevos[index].cantidad || 0) * parseFloat(nuevos[index].precio_unitario || 0)
    }
    setDetalles(nuevos)
    recalcularMonto(nuevos)
  }

  const handleSubmit = async () => {
    if (!form.id_categoria_movimiento) {
      Swal.fire('Atención', 'Selecciona una categoría', 'warning')
      return
    }
    if (!form.monto || parseFloat(form.monto) <= 0) {
      Swal.fire('Atención', 'Ingresa un monto válido', 'warning')
      return
    }
    if (!form.concepto.trim()) {
      Swal.fire('Atención', 'Ingresa el concepto', 'warning')
      return
    }

    setProcesando(true)
    const fd = new FormData()
    fd.append('tipo', form.tipo)
    fd.append('id_categoria_movimiento', form.id_categoria_movimiento)
    fd.append('monto', form.monto)
    fd.append('concepto', form.concepto)
    if (form.proveedor) fd.append('proveedor', form.proveedor)
    if (detalles.length > 0) fd.append('detalles', JSON.stringify(detalles))

    const result = await movimientoCajaService.registrarMovimiento(fd)
    setProcesando(false)

    if (result.error) {
      Swal.fire('Error', result.error, 'error')
    } else {
      Swal.fire('Éxito', 'Movimiento registrado', 'success')
      cerrarModal()
      cargar()
    }
  }

  const catsFiltradas = categorias.filter((c) => c.aplica_a === form.tipo || c.aplica_a === 'ambos')

  return (
    <div className="min-w-0 max-w-full space-y-4 lg:p-2 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button onClick={abrirModal} className="btn-primary flex shrink-0 items-center justify-center gap-2">
          <Plus className="h-4 w-4" /> Nuevo movimiento
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-3">
        <TarjetaResumen
          icono={ArrowDownLeft}
          etiqueta="Entradas"
          monto={formatMoney(totales.entradas)}
          detalle={`${conteo.entrada} ${conteo.entrada === 1 ? 'movimiento' : 'movimientos'}`}
          tono="entrada"
        />
        <TarjetaResumen
          icono={ArrowUpRight}
          etiqueta="Salidas"
          monto={formatMoney(totales.salidas)}
          detalle={`${conteo.salida} ${conteo.salida === 1 ? 'movimiento' : 'movimientos'}`}
          tono="salida"
        />
        <div className="col-span-2 lg:col-span-1">
          <TarjetaResumen
            icono={Scale}
            etiqueta="Neto"
            monto={formatMoney(totales.neto)}
            detalle="Entradas menos salidas"
            tono="neto"
            colorMonto={totales.neto < 0 ? 'text-red-600' : 'text-marca-700'}
          />
        </div>
      </div>

      <div className="card min-w-0 !p-3 sm:!p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-gray-100 p-1 sm:inline-grid">
            {FILTROS_TIPO.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTipo(f.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filtroTipo === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-0 sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar concepto, categoría..."
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-marca-600" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center text-gray-400">
              <Inbox className="mb-2 h-10 w-10 opacity-60" />
              <p className="text-sm">
                {movimientos.length === 0 ? 'No hay movimientos registrados' : 'Ningún movimiento coincide con el filtro'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {grupos.map((grupo) => (
                <section key={grupo.etiqueta}>
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{grupo.etiqueta}</h2>
                    <span className={`text-xs font-semibold tabular-nums ${grupo.neto < 0 ? 'text-red-600' : 'text-marca-700'}`}>
                      {grupo.neto < 0 ? '−' : '+'}{formatMoney(Math.abs(grupo.neto))}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
                    {grupo.items.map((m) => {
                      const entrada = m.tipo === 'entrada'
                      const Icono = entrada ? ArrowDownLeft : ArrowUpRight
                      return (
                        <li key={m.id_movimiento_caja} className="flex items-center gap-3 bg-white px-3 py-3 sm:px-4">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                              entrada ? 'bg-marca-100 text-marca-700' : 'bg-red-100 text-red-700'
                            }`}
                          >
                            <Icono className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">{m.concepto}</p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{m.categoria_nombre}</span>
                              <span>{horaCorta(m.fecha_movimiento)}</span>
                              <span className="text-gray-300">·</span>
                              <span className="truncate">{m.nombre_usuario}</span>
                              {m.proveedor && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="truncate">{m.proveedor}</span>
                                </>
                              )}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-sm font-semibold tabular-nums sm:text-base ${
                              entrada ? 'text-marca-700' : 'text-red-600'
                            }`}
                          >
                            {entrada ? '+' : '−'}{formatMoney(m.monto)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo movimiento */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-4"
          onClick={cerrarModal}
        >
          <div
            className="mt-2 w-full max-w-lg rounded-xl bg-white shadow-xl sm:mt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Nuevo movimiento</h2>
              <button
                onClick={cerrarModal}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'salida', label: 'Salida', Icono: ArrowUpRight, activo: 'border-red-400 bg-red-50 text-red-700' },
                  { id: 'entrada', label: 'Entrada', Icono: ArrowDownLeft, activo: 'border-marca-500 bg-marca-50 text-marca-700' },
                ].map(({ id, label, Icono, activo }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: id, id_categoria_movimiento: '' })}
                    className={`flex items-center justify-center gap-2 rounded-lg border-2 py-2.5 text-sm font-medium transition-colors ${
                      form.tipo === id ? activo : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icono className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Categoría</label>
                  <select
                    value={form.id_categoria_movimiento}
                    onChange={(e) => setForm({ ...form, id_categoria_movimiento: e.target.value })}
                    className="input text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {catsFiltradas.map((c) => (
                      <option key={c.id_categoria_movimiento} value={c.id_categoria_movimiento}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="mb-1 block text-xs font-medium text-gray-600">Monto</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                    <input
                      placeholder="0.00"
                      type="text"
                      inputMode="decimal"
                      value={conSeparadorMiles(form.monto)}
                      onChange={(e) => setForm({ ...form, monto: sanitizeMonto(e.target.value) })}
                      className="input pl-7 text-left text-sm tabular-nums"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Concepto</label>
                <input
                  placeholder="Descripción del movimiento"
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  className="input text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Proveedor</label>
                <input
                  placeholder="Opcional"
                  value={form.proveedor}
                  onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                  className="input text-sm"
                />
              </div>

              {form.tipo === 'salida' && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-800">Detalle de compra</h3>
                    <button
                      type="button"
                      onClick={agregarDetalle}
                      className="text-sm font-medium text-marca-600 hover:text-marca-700"
                    >
                      + Renglón
                    </button>
                  </div>
                  {detalles.length === 0 && (
                    <p className="text-xs text-gray-400">Opcional. Agrega renglones si quieres desglosar la compra.</p>
                  )}
                  <div className="space-y-2">
                    {detalles.map((d, i) => (
                      <div key={i} className="grid grid-cols-[1fr_4rem_5rem_auto] items-center gap-2">
                        <input
                          placeholder="Descripción"
                          value={d.descripcion}
                          onChange={(e) => actualizarDetalle(i, 'descripcion', e.target.value)}
                          className="input min-w-0 px-2 py-1.5 text-sm"
                        />
                        <input
                          placeholder="Cant."
                          type="number"
                          value={d.cantidad}
                          onChange={(e) => actualizarDetalle(i, 'cantidad', e.target.value)}
                          className="input min-w-0 px-2 py-1.5 text-sm"
                        />
                        <input
                          placeholder="P. unit."
                          type="number"
                          value={d.precio_unitario}
                          onChange={(e) => actualizarDetalle(i, 'precio_unitario', e.target.value)}
                          className="input min-w-0 px-2 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => quitarDetalle(i)}
                          className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                          aria-label="Quitar renglón"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={cerrarModal}
                className="rounded-lg border-2 border-red-200 py-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={procesando}
                className="btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                {procesando ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MovimientosCaja
