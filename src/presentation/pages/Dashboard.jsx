import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Loader2,
  Eye,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
  Coins,
  Percent,
  Banknote,
  CreditCard,
  Bike,
  ArrowLeftRight,
  AlertCircle,
} from 'lucide-react'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { useReportes } from '../hooks/useReportes'
import { useProductos } from '../hooks/useProductos'
import { formatPrecio } from '../utils/numberFormatter'
import { METODOS_PAGO_DISPONIBLES } from '../utils/metodosPagoConfig'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

const ICONOS_METODO = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  delivery: Bike,
  transferencia: ArrowLeftRight,
}

const COLORES_METODO = {
  efectivo: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: 'text-emerald-600' },
  tarjeta: { bg: 'bg-blue-100', text: 'text-blue-700', icon: 'text-blue-600' },
  delivery: { bg: 'bg-violet-100', text: 'text-violet-700', icon: 'text-violet-600' },
  transferencia: { bg: 'bg-sky-100', text: 'text-sky-700', icon: 'text-sky-600' },
}

const labelMetodoPago = (metodo) => {
  if (!metodo) return '—'
  const found = METODOS_PAGO_DISPONIBLES.find((m) => m.id === metodo)
  return found?.label || String(metodo).replace(/-/g, ' ')
}

const Dashboard = () => {
  const { obtenerVentas, obtenerVenta } = useVentas()
  const { obtenerComandas } = useComandas()
  const { obtenerVentasPorDia, obtenerProductosMasVendidos, obtenerPropinasPorFecha, obtenerDescuentosPorFecha } = useReportes()
  const { productos } = useProductos()
  const [ventas, setVentas] = useState([])
  const [comandas, setComandas] = useState([])
  const [ventasSemana, setVentasSemana] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [totalPropinas, setTotalPropinas] = useState(0)
  const [totalDescuentos, setTotalDescuentos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingGrafico, setLoadingGrafico] = useState(false)
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false)
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [busquedaVentas, setBusquedaVentas] = useState('')
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('')
  const [filtroTipoServicio, setFiltroTipoServicio] = useState('')
  const [paginaVentas, setPaginaVentas] = useState(1)
  const [tamanoPagina, setTamanoPagina] = useState(10)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        setLoadingGrafico(true)

        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
        const ventasHoy = await obtenerVentas(hoy, hoy).catch(() => [])
        setVentas(ventasHoy || [])

        const [propinasData, descuentosData] = await Promise.all([
          obtenerPropinasPorFecha(hoy, hoy).catch(() => ({ total_propinas: 0 })),
          obtenerDescuentosPorFecha(hoy, hoy).catch(() => ({ total_descuentos: 0 })),
        ])
        setTotalPropinas(propinasData?.total_propinas ?? 0)
        setTotalDescuentos(descuentosData?.total_descuentos ?? 0)

        const comandasActivas = await obtenerComandas('pendiente').catch(() => [])
        const comandasEnPreparacion = await obtenerComandas('en_preparacion').catch(() => [])
        setComandas([...(comandasActivas || []), ...(comandasEnPreparacion || [])])

        const fechaFin = new Date()
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - 7)
        const ventasSemanaData = await obtenerVentasPorDia(
          fechaInicio.toISOString().split('T')[0],
          fechaFin.toISOString().split('T')[0]
        )
        setVentasSemana(ventasSemanaData || [])

        const fechaFinProductos = new Date()
        const fechaInicioProductos = new Date()
        fechaInicioProductos.setDate(fechaInicioProductos.getDate() - 30)
        const productosMasVendidosData = await obtenerProductosMasVendidos(
          fechaInicioProductos.toISOString().split('T')[0],
          fechaFinProductos.toISOString().split('T')[0],
          5
        )
        setProductosMasVendidos(productosMasVendidosData || [])
      } catch {
        setVentas([])
        setComandas([])
      } finally {
        setLoading(false)
        setLoadingGrafico(false)
      }
    }
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ventasTotales = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const pedidosTotales = ventas.length
  const ticketPromedio = pedidosTotales > 0 ? ventasTotales / pedidosTotales : 0
  const productosVendidos = ventas.reduce((sum, v) => {
    return sum + (v.detalles?.reduce((dSum, d) => dSum + (d.cantidad || 0), 0) || 0)
  }, 0)
  const ordenesActivas = comandas.length

  const conteoPorMetodo = useMemo(() => {
    const counts = {}
    ventas.forEach((v) => {
      const key = v.metodo_pago || 'otro'
      counts[key] = (counts[key] || 0) + 1
    })
    return METODOS_PAGO_DISPONIBLES.map((m) => ({
      ...m,
      cantidad: counts[m.id] || 0,
    })).filter((m) => m.cantidad > 0 || ['efectivo', 'tarjeta', 'delivery'].includes(m.id))
  }, [ventas])

  const nombreProductoDetalle = (detalle) => {
    if (detalle.producto_nombre) return detalle.producto_nombre
    if (detalle.id_producto == null || detalle.id_producto === '') {
      return detalle.nombre_producto || 'Producto personalizado'
    }
    const producto = productos.find((p) => p.id_producto === detalle.id_producto)
    return producto?.nombre || detalle.nombre_producto || `Producto #${detalle.id_producto}`
  }

  const resumenProductos = (venta) => {
    const detalles = venta.detalles || []
    if (detalles.length === 0) return '—'
    const nombres = detalles.map((d) => {
      const nombre = nombreProductoDetalle(d)
      return d.cantidad > 1 ? `${d.cantidad}× ${nombre}` : nombre
    })
    if (nombres.length <= 2) return nombres.join(', ')
    return `${nombres.slice(0, 2).join(', ')} +${nombres.length - 2}`
  }

  const cantidadProductos = (venta) =>
    (venta.detalles || []).reduce((sum, d) => sum + (Number(d.cantidad) || 0), 0)

  const tieneDescuento = (venta) => parseFloat(venta.total_descuento || 0) > 0
  const tienePropina = (venta) => parseFloat(venta.monto_propina || 0) > 0

  const nombreCliente = (venta) =>
    venta.nombre_cliente || venta.cliente_nombre || 'Sin nombre'

  const ventasFiltradas = useMemo(() => {
    const q = busquedaVentas.trim().toLowerCase()
    return ventas.filter((venta) => {
      if (filtroMetodoPago && venta.metodo_pago !== filtroMetodoPago) return false

      const tipo = venta.tipo_servicio || ''
      if (filtroTipoServicio === 'comer-aqui' && tipo !== 'comer-aqui') return false
      if (filtroTipoServicio === 'para-llevar' && tipo !== 'para-llevar' && tipo !== 'delivery') return false

      if (!q) return true

      const cliente = nombreCliente(venta).toLowerCase()
      const metodo = labelMetodoPago(venta.metodo_pago).toLowerCase()
      const vendedor = String(venta.vendedor_nombre || '').toLowerCase()
      const id = String(venta.id_venta || '')
      const productosTxt = resumenProductos(venta).toLowerCase()
      const total = String(venta.total || '')

      return (
        cliente.includes(q) ||
        metodo.includes(q) ||
        vendedor.includes(q) ||
        id.includes(q) ||
        productosTxt.includes(q) ||
        total.includes(q)
      )
    })
  }, [ventas, busquedaVentas, filtroMetodoPago, filtroTipoServicio, productos])

  const totalPaginas = Math.max(1, Math.ceil(ventasFiltradas.length / tamanoPagina))
  const paginaActual = Math.min(paginaVentas, totalPaginas)
  const ventasPaginadas = useMemo(() => {
    const inicio = (paginaActual - 1) * tamanoPagina
    return ventasFiltradas.slice(inicio, inicio + tamanoPagina)
  }, [ventasFiltradas, paginaActual, tamanoPagina])

  useEffect(() => {
    setPaginaVentas(1)
  }, [busquedaVentas, filtroMetodoPago, filtroTipoServicio, tamanoPagina])

  const formatearFechaSemana = (fechaStr) => {
    if (!fechaStr) return ''
    const parts = String(fechaStr).split('T')[0].split('-')
    if (parts.length !== 3) return fechaStr
    const fecha = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
  }

  const formatearFechaHora = (fechaStr) => {
    if (!fechaStr) return '—'
    return new Date(fechaStr).toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const abrirModalDetalles = async (venta) => {
    setMostrarModalDetalles(true)
    setCargandoDetalle(true)
    setVentaDetalle(null)
    try {
      const completa = await obtenerVenta(venta.id_venta ?? venta)
      setVentaDetalle({
        ...completa,
        vendedor_nombre: completa.vendedor_nombre_completo || completa.vendedor_nombre || venta.vendedor_nombre,
      })
    } catch {
      setVentaDetalle({ error: true })
    } finally {
      setCargandoDetalle(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cards resumen del día (igual que reportes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">${formatPrecio(ventasTotales)}</p>
              <p className="text-xs text-gray-500 mt-1">Hoy</p>
            </div>
            <div className="p-3 bg-matcha-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-matcha-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Descuentos</p>
              <p className="text-2xl font-bold text-amber-600">${formatPrecio(totalDescuentos)}</p>
              <p className="text-xs text-gray-500 mt-1">Hoy</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Percent className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Propinas</p>
              <p className="text-2xl font-bold text-matcha-600">${formatPrecio(totalPropinas)}</p>
              <p className="text-xs text-gray-500 mt-1">Hoy</p>
            </div>
            <div className="p-3 bg-matcha-100 rounded-lg">
              <Coins className="w-6 h-6 text-matcha-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
              <p className="text-2xl font-bold text-gray-900">${formatPrecio(ticketPromedio)}</p>
              <p className="text-xs text-gray-500 mt-1">Por venta</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Órdenes Activas</p>
              <p className="text-2xl font-bold text-gray-900">{ordenesActivas}</p>
              <p className="text-xs text-gray-500 mt-1">En cocina</p>
            </div>
            <div className="p-3 bg-coffee-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-coffee-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="card flex-1 min-w-[200px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Productos Vendidos</p>
              <p className="text-2xl font-bold text-gray-900">{productosVendidos}</p>
              <p className="text-xs text-gray-500 mt-1">Unidades de hoy</p>
            </div>
            <div className="p-3 bg-coffee-100 rounded-lg">
              <Package className="w-6 h-6 text-coffee-600" />
            </div>
          </div>
        </div>

        <div className="card flex-1 min-w-[200px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cantidad de ventas</p>
              <p className="text-2xl font-bold text-gray-900">{pedidosTotales}</p>
              <p className="text-xs text-gray-500 mt-1">Tickets de hoy</p>
            </div>
            <div className="p-3 bg-matcha-100 rounded-lg">
              <Package className="w-6 h-6 text-matcha-600" />
            </div>
          </div>
        </div>

        {conteoPorMetodo.map((metodo) => {
          const Icono = ICONOS_METODO[metodo.id] || CreditCard
          const colores = COLORES_METODO[metodo.id] || COLORES_METODO.tarjeta
          return (
            <div key={metodo.id} className="card flex-1 min-w-[200px]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metodo.label}</p>
                  <p className={`text-2xl font-bold ${colores.text}`}>{metodo.cantidad}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {metodo.cantidad === 1 ? 'venta' : 'ventas'}
                  </p>
                </div>
                <div className={`p-3 ${colores.bg} rounded-lg`}>
                  <Icono className={`w-6 h-6 ${colores.icon}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventas de la Semana
          </h2>
          {loadingGrafico ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
            </div>
          ) : ventasSemana.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No hay datos para mostrar</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={ventasSemana}>
                <defs>
                  <linearGradient id="colorVentasSemana" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5a8f5a" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#5a8f5a" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={formatearFechaSemana}
                  stroke="#6b7280"
                />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  formatter={(value) => `$${Number(value).toFixed(2)}`}
                  labelFormatter={(label) => {
                    if (!label) return ''
                    const parts = String(label).split('T')[0].split('-')
                    if (parts.length !== 3) return label
                    const fecha = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                    return fecha.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
                  }}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="total_ventas"
                  stroke="#5a8f5a"
                  strokeWidth={3}
                  fill="url(#colorVentasSemana)"
                  dot={{ fill: '#5a8f5a', r: 4, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                  name="Ventas ($)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Productos Más Vendidos
          </h2>
          <div className="space-y-3">
            {productosMasVendidos.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No hay datos para mostrar</p>
            ) : (
              productosMasVendidos.map((product, index) => (
                <div key={product.id_producto} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-matcha-100 text-matcha-600 rounded-full flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{product.nombre}</p>
                    <p className="text-sm text-gray-500">{product.categoria}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Ventas del día — misma tabla que reportes */}
      <div className="card">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Ventas de hoy
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              className="input pl-9 pr-9"
              placeholder="Buscar por cliente, producto, total o # venta..."
              value={busquedaVentas}
              onChange={(e) => setBusquedaVentas(e.target.value)}
            />
            {busquedaVentas && (
              <button
                type="button"
                onClick={() => setBusquedaVentas('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
                aria-label="Limpiar búsqueda"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <div>
            <select
              className="input"
              value={filtroMetodoPago}
              onChange={(e) => setFiltroMetodoPago(e.target.value)}
            >
              <option value="">Todos los métodos de pago</option>
              {METODOS_PAGO_DISPONIBLES.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <select
              className="input"
              value={filtroTipoServicio}
              onChange={(e) => setFiltroTipoServicio(e.target.value)}
            >
              <option value="">Todos los tipos de servicio</option>
              <option value="comer-aqui">Comer aquí</option>
              <option value="para-llevar">Delivery</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <p className="text-sm text-gray-600">
            {ventasFiltradas.length === 0
              ? 'Sin resultados'
              : `Mostrando ${(paginaActual - 1) * tamanoPagina + 1}–${Math.min(paginaActual * tamanoPagina, ventasFiltradas.length)} de ${ventasFiltradas.length}`}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap" htmlFor="tamano-pagina-dashboard">
              Por página
            </label>
            <select
              id="tamano-pagina-dashboard"
              className="input py-1.5 w-auto min-w-[5rem]"
              value={tamanoPagina}
              onChange={(e) => setTamanoPagina(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Fecha</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Cliente</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900">Productos</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900" title="Descuento">Dto.</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-900" title="Propina">Prop.</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Método de pago</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Total</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    No hay ventas hoy
                  </td>
                </tr>
              ) : ventasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    No hay ventas que coincidan con la búsqueda o filtros
                  </td>
                </tr>
              ) : (
                ventasPaginadas.map((venta) => (
                  <tr
                    key={venta.id_venta}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-gray-900 whitespace-nowrap">
                      {formatearFechaHora(venta.fecha_venta)}
                    </td>
                    <td className="py-3 px-4 text-gray-900">
                      {nombreCliente(venta)}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-900 font-medium">
                      {cantidadProductos(venta)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tieneDescuento(venta) ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700"
                          title={`Descuento: $${formatPrecio(venta.total_descuento)}`}
                        >
                          <Percent className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {tienePropina(venta) ? (
                        <span
                          className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-matcha-100 text-matcha-700"
                          title={`Propina: $${formatPrecio(venta.monto_propina)}`}
                        >
                          <Coins className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-700 capitalize">
                      {labelMetodoPago(venta.metodo_pago)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-matcha-600 whitespace-nowrap">
                      ${formatPrecio(venta.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => abrirModalDetalles(venta)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-matcha-700 border border-matcha-200 rounded-lg hover:bg-matcha-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalles
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {ventasFiltradas.length > 0 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Página {paginaActual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaginaVentas((p) => Math.max(1, p - 1))}
                disabled={paginaActual <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPaginaVentas((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual >= totalPaginas}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalles */}
      {mostrarModalDetalles && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">
                Detalle de venta{ventaDetalle?.id_venta ? ` #${ventaDetalle.id_venta}` : ''}
              </h2>
              <button
                type="button"
                onClick={() => setMostrarModalDetalles(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {cargandoDetalle ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
                </div>
              ) : ventaDetalle?.error ? (
                <div className="py-8 text-center text-gray-500">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                  <p>No se pudieron cargar los detalles</p>
                </div>
              ) : ventaDetalle ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Fecha y hora</p>
                      <p className="font-medium text-gray-900">
                        {formatearFechaHora(ventaDetalle.fecha_venta)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cliente</p>
                      <p className="font-medium text-gray-900">
                        {nombreCliente(ventaDetalle)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Quién atendió</p>
                      <p className="font-medium text-gray-900">
                        {ventaDetalle.vendedor_nombre || ventaDetalle.vendedor_nombre_completo || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Método de pago</p>
                      <p className="font-medium text-gray-900">
                        {labelMetodoPago(ventaDetalle.metodo_pago)}
                      </p>
                    </div>
                    {ventaDetalle.tipo_servicio && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de servicio</p>
                        <p className="font-medium text-gray-900">
                          {ventaDetalle.tipo_servicio === 'comer-aqui' ? 'Comer aquí' : 'Delivery'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="text-xl font-bold text-matcha-600">
                        ${formatPrecio(ventaDetalle.total)}
                      </p>
                    </div>
                    {(ventaDetalle.total_descuento != null && parseFloat(ventaDetalle.total_descuento) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Descuento</p>
                        <p className="font-medium text-amber-700">
                          -${formatPrecio(ventaDetalle.total_descuento)}
                          {ventaDetalle.descuento_tipo === 'porcentaje' && ventaDetalle.descuento_valor != null && (
                            <span className="text-gray-500 text-sm ml-1">({ventaDetalle.descuento_valor}%)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {(ventaDetalle.monto_propina != null && parseFloat(ventaDetalle.monto_propina) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Propina</p>
                        <p className="font-medium text-matcha-700">
                          +${formatPrecio(ventaDetalle.monto_propina)}
                        </p>
                      </div>
                    )}
                  </div>

                  {ventaDetalle.comentarios && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Comentarios</p>
                      <p className="text-sm text-gray-700 italic">{ventaDetalle.comentarios}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-3">Productos vendidos</p>
                    <div className="space-y-3">
                      {ventaDetalle.detalles?.length > 0 ? (
                        ventaDetalle.detalles.map((detalle, index) => (
                          <div
                            key={detalle.id_detalle || index}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <p className="font-medium text-gray-900">{nombreProductoDetalle(detalle)}</p>
                            <p className="text-sm text-gray-600 mt-0.5">
                              {detalle.cantidad} × ${formatPrecio(detalle.precio_unitario)} = ${formatPrecio(detalle.subtotal)}
                            </p>
                            {detalle.observaciones && (
                              <p className="text-xs text-gray-500 mt-2">{detalle.observaciones}</p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">Sin productos registrados</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
