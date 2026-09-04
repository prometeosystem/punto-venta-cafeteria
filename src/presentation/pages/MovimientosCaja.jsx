import { useState, useEffect } from 'react'
import { movimientoCajaService } from '../../application/services/movimientoCajaService'
import { Plus, Loader2, X } from 'lucide-react'
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

const MovimientosCaja = () => {
  const [movimientos, setMovimientos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [form, setForm] = useState(formInicial)
  const [detalles, setDetalles] = useState([])
  const [totales, setTotales] = useState({ entradas: 0, salidas: 0, neto: 0 })

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

  const agregarDetalle = () => {
    setDetalles([...detalles, { descripcion: '', cantidad: 1, precio_unitario: 0, subtotal: 0 }])
  }

  const actualizarDetalle = (index, field, value) => {
    const nuevos = [...detalles]
    nuevos[index][field] = value
    if (field === 'cantidad' || field === 'precio_unitario') {
      nuevos[index].subtotal = parseFloat(nuevos[index].cantidad || 0) * parseFloat(nuevos[index].precio_unitario || 0)
    }
    setDetalles(nuevos)
    const suma = nuevos.reduce((acc, d) => acc + (d.subtotal || 0), 0)
    if (suma > 0) setForm({ ...form, monto: suma.toFixed(2) })
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
    <div className="p-6">
      <div className="flex items-center justify-end mb-6">
        <button
          onClick={abrirModal}
          className="flex items-center gap-2 bg-matcha-500 text-white px-4 py-2 rounded-lg hover:bg-matcha-600"
        >
          <Plus className="w-4 h-4" /> Nuevo movimiento
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-700">Entradas</p>
          <p className="text-xl font-bold">{formatMoney(totales.entradas)}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-700">Salidas</p>
          <p className="text-xl font-bold">{formatMoney(totales.salidas)}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">Neto</p>
          <p className="text-xl font-bold">{formatMoney(totales.neto)}</p>
        </div>
      </div>

      {loading ? (
        <Loader2 className="w-8 h-8 animate-spin" />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-coffee-800 text-white">
              <tr>
                <th className="p-3 text-left">Fecha</th>
                <th className="p-3 text-left">Tipo</th>
                <th className="p-3 text-left">Categoría</th>
                <th className="p-3 text-left">Concepto</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-400">
                    No hay movimientos registrados
                  </td>
                </tr>
              )}
              {movimientos.map((m) => (
                <tr key={m.id_movimiento_caja} className="border-b">
                  <td className="p-3">{new Date(m.fecha_movimiento).toLocaleString('es-MX')}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${m.tipo === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {m.tipo}
                    </span>
                  </td>
                  <td className="p-3">{m.categoria_nombre}</td>
                  <td className="p-3">{m.concepto}</td>
                  <td className="p-3 text-right font-medium">{formatMoney(m.monto)}</td>
                  <td className="p-3">{m.nombre_usuario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Nuevo movimiento */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={cerrarModal}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl">
              <h2 className="text-lg font-semibold text-coffee-800">Nuevo movimiento</h2>
              <button
                onClick={cerrarModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value, id_categoria_movimiento: '' })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="salida">Salida</option>
                    <option value="entrada">Entrada</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Categoría</label>
                  <select
                    value={form.id_categoria_movimiento}
                    onChange={(e) => setForm({ ...form, id_categoria_movimiento: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar</option>
                    {catsFiltradas.map((c) => (
                      <option key={c.id_categoria_movimiento} value={c.id_categoria_movimiento}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Monto</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">$</span>
                    <input
                      placeholder="0.00"
                      type="text"
                      inputMode="decimal"
                      value={conSeparadorMiles(form.monto)}
                      onChange={(e) => setForm({ ...form, monto: sanitizeMonto(e.target.value) })}
                      className="w-full border rounded-lg pl-7 pr-3 py-2 text-sm text-left tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Proveedor</label>
                  <input
                    placeholder="Opcional"
                    value={form.proveedor}
                    onChange={(e) => setForm({ ...form, proveedor: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Concepto</label>
                <input
                  placeholder="Descripción del movimiento"
                  value={form.concepto}
                  onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {form.tipo === 'salida' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-800">Detalle de compra</h3>
                    <button
                      type="button"
                      onClick={agregarDetalle}
                      className="text-sm text-matcha-600 hover:text-matcha-700 font-medium"
                    >
                      + Renglón
                    </button>
                  </div>
                  {detalles.length === 0 && (
                    <p className="text-xs text-gray-400 mb-2">Opcional. Agrega renglones si quieres desglosar la compra.</p>
                  )}
                  {detalles.map((d, i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 mb-2">
                      <input
                        placeholder="Descripción"
                        value={d.descripcion}
                        onChange={(e) => actualizarDetalle(i, 'descripcion', e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm col-span-2"
                      />
                      <input
                        placeholder="Cant."
                        type="number"
                        value={d.cantidad}
                        onChange={(e) => actualizarDetalle(i, 'cantidad', e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="P. unit."
                        type="number"
                        value={d.precio_unitario}
                        onChange={(e) => actualizarDetalle(i, 'precio_unitario', e.target.value)}
                        className="border rounded-lg px-2 py-1.5 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-200 sticky bottom-0 bg-white rounded-b-xl">
              <button
                type="button"
                onClick={cerrarModal}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={procesando}
                className="flex-1 bg-coffee-800 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-coffee-900 disabled:opacity-50"
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
