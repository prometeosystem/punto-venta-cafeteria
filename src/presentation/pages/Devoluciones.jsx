import { useEffect, useState } from 'react'
import { Search, Loader2, RotateCcw, Package } from 'lucide-react'
import { devolucionesService } from '../../application/services/devolucionesService'
import { usePreferencias } from '../context/PreferenciasContext'
import Swal from 'sweetalert2'

const alertArriba = (opts) =>
  Swal.fire({
    position: 'top',
    confirmButtonColor: 'rgb(var(--marca-500))',
    ...opts,
  })

const Devoluciones = () => {
  const { modoTienda } = usePreferencias()
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [venta, setVenta] = useState(null)
  const [cantidades, setCantidades] = useState({})
  const [metodo, setMetodo] = useState('efectivo')
  const [motivo, setMotivo] = useState('')
  // Tienda: suele volver mercancía. Cafetería: comida ya preparada → solo dinero.
  const [reingresarStock, setReingresarStock] = useState(true)
  const [cargando, setCargando] = useState(false)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    setReingresarStock(!!modoTienda)
  }, [modoTienda])

  const buscar = async () => {
    const q = busqueda.trim()
    if (!q) return
    setCargando(true)
    setVenta(null)
    try {
      const data = await devolucionesService.buscarTicket(q)
      setResultados(Array.isArray(data) ? data : [])
      if (Array.isArray(data) && data.length === 1) {
        await abrirVenta(data[0].id_venta)
      } else if (Array.isArray(data) && data.length === 0) {
        await alertArriba({
          icon: 'info',
          title: 'Sin resultados',
          text: 'No hay ventas con ese criterio',
          timer: 2200,
          showConfirmButton: false,
        })
      }
    } catch (err) {
      await alertArriba({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.detail || 'No se pudo buscar',
      })
    } finally {
      setCargando(false)
    }
  }

  const abrirVenta = async (idVenta) => {
    setCargando(true)
    try {
      const data = await devolucionesService.ventaParaDevolucion(idVenta)
      setVenta(data)
      const init = {}
      ;(data.detalles || []).forEach((d) => {
        init[d.id_detalle_venta] = 0
      })
      setCantidades(init)
      setResultados([])
    } catch (err) {
      await alertArriba({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.detail || 'No se pudo cargar la venta',
      })
    } finally {
      setCargando(false)
    }
  }

  const itemsADevolver = () =>
    Object.entries(cantidades)
      .map(([id, cantidad]) => ({
        id_detalle_venta: Number(id),
        cantidad: Number(cantidad),
      }))
      .filter((i) => i.cantidad > 0)

  const montoEstimado = () => {
    if (!venta) return 0
    return itemsADevolver().reduce((sum, item) => {
      const det = venta.detalles.find((d) => d.id_detalle_venta === item.id_detalle_venta)
      if (!det) return sum
      return sum + item.cantidad * parseFloat(det.precio_unitario || 0)
    }, 0)
  }

  const confirmar = async () => {
    const items = itemsADevolver()
    if (!items.length) {
      await alertArriba({
        icon: 'warning',
        title: 'Atención',
        text: 'Indica la cantidad a devolver de al menos un producto',
      })
      return
    }
    const ok = await alertArriba({
      title: reingresarStock ? 'Confirmar devolución' : 'Confirmar reembolso',
      html: reingresarStock
        ? `Se reembolsarán <b>$${montoEstimado().toFixed(2)}</b> (${metodo}) y se <b>reingresa</b> el stock/insumos.`
        : `Se reembolsarán <b>$${montoEstimado().toFixed(2)}</b> (${metodo}) <b>sin</b> regresar nada al inventario (comida ya preparada o no usable).`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: reingresarStock ? 'Devolver' : 'Reembolsar',
      cancelButtonText: 'Cancelar',
    })
    if (!ok.isConfirmed) return

    setProcesando(true)
    try {
      const res = await devolucionesService.devolver({
        id_venta: venta.id_venta,
        items,
        metodo_reembolso: metodo,
        motivo: motivo.trim() || null,
        reingresar_stock: reingresarStock,
      })
      await alertArriba({
        icon: 'success',
        title: 'Listo',
        text: `${reingresarStock ? 'Devolución' : 'Reembolso'} #${res.id_devolucion} por $${Number(res.monto_total).toFixed(2)}`,
        timer: 2500,
        showConfirmButton: false,
      })
      setVenta(null)
      setBusqueda('')
      setMotivo('')
    } catch (err) {
      await alertArriba({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.detail || 'No se pudo registrar la devolución',
      })
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Buscar ticket</h2>
        <p className="text-sm text-gray-500 mb-4">Por número de venta o nombre del cliente</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9 w-full"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscar()}
              placeholder="Ej. 1542 o Juan"
            />
          </div>
          <button type="button" className="btn-primary flex items-center justify-center gap-2" onClick={buscar} disabled={cargando}>
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Buscar
          </button>
        </div>

        {resultados.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
            {resultados.map((v) => (
              <li key={v.id_venta}>
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 flex justify-between gap-3"
                  onClick={() => abrirVenta(v.id_venta)}
                >
                  <span>
                    <span className="font-medium">#{v.id_venta}</span>
                    {v.nombre_cliente ? ` · ${v.nombre_cliente}` : ''}
                  </span>
                  <span className="text-sm text-gray-600">${parseFloat(v.total || 0).toFixed(2)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {venta && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                Venta #{venta.id_venta}
              </h2>
              <p className="text-sm text-gray-500">
                {venta.nombre_cliente || 'Sin nombre'} · {venta.metodo_pago} · total ${parseFloat(venta.total || 0).toFixed(2)}
              </p>
            </div>
            <button type="button" className="text-sm text-gray-500 hover:text-gray-800" onClick={() => setVenta(null)}>
              Cerrar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Vendidos</th>
                  <th className="py-2 pr-3">Ya dev.</th>
                  <th className="py-2 pr-3">Disponible</th>
                  <th className="py-2 pr-3">Devolver</th>
                  <th className="py-2">Precio</th>
                </tr>
              </thead>
              <tbody>
                {(venta.detalles || []).map((d) => (
                  <tr key={d.id_detalle_venta} className="border-b border-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-800">{d.producto_nombre || d.nombre_producto}</td>
                    <td className="py-2 pr-3">{d.cantidad_vendida}</td>
                    <td className="py-2 pr-3">{d.cantidad_devuelta}</td>
                    <td className="py-2 pr-3">{d.cantidad_disponible}</td>
                    <td className="py-2 pr-3">
                      <input
                        type="number"
                        min="0"
                        max={d.cantidad_disponible}
                        step="1"
                        className="input w-20 py-1"
                        disabled={d.cantidad_disponible <= 0}
                        value={cantidades[d.id_detalle_venta] ?? 0}
                        onChange={(e) => {
                          const n = Math.min(d.cantidad_disponible, Math.max(0, Number(e.target.value) || 0))
                          setCantidades((prev) => ({ ...prev, [d.id_detalle_venta]: n }))
                        }}
                      />
                    </td>
                    <td className="py-2">${parseFloat(d.precio_unitario || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Qué hacer con el producto</p>
            <label className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${!reingresarStock ? 'border-marca-500 bg-marca-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                className="mt-1"
                checked={!reingresarStock}
                onChange={() => setReingresarStock(false)}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Solo reembolso (cafetería / restaurante)</span>
                
              </span>
            </label>
            <label className={`flex gap-3 p-3 rounded-lg border cursor-pointer ${reingresarStock ? 'border-marca-500 bg-marca-50' : 'border-gray-200'}`}>
              <input
                type="radio"
                className="mt-1"
                checked={reingresarStock}
                onChange={() => setReingresarStock(true)}
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Devolución con stock (tienda)</span>
                
              </span>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-gray-600">Método de reembolso</span>
              <select className="input mt-1 w-full" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo (sale de caja)</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="nota_credito">Nota de crédito</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Motivo (opcional)</span>
              <input className="input mt-1 w-full" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
            <p className="text-base font-semibold text-gray-900">
              A reembolsar: ${montoEstimado().toFixed(2)}
            </p>
            <button
              type="button"
              className="btn-primary flex items-center justify-center gap-2"
              onClick={confirmar}
              disabled={procesando}
            >
              {procesando ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              {reingresarStock ? 'Registrar devolución' : 'Registrar reembolso'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Devoluciones
