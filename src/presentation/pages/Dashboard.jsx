import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, ShoppingCart, Loader2, Eye, X } from 'lucide-react'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { useClientes } from '../hooks/useClientes'
import { useReportes } from '../hooks/useReportes'
import { useProductos } from '../hooks/useProductos'
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

const Dashboard = () => {
  const { obtenerVentas, obtenerVenta } = useVentas()
  const { obtenerComandas } = useComandas()
  const { clientes } = useClientes()
  const { obtenerVentasPorDia, obtenerProductosMasVendidos } = useReportes()
  const { productos } = useProductos()
  const [ventas, setVentas] = useState([])
  const [comandas, setComandas] = useState([])
  const [ventasSemana, setVentasSemana] = useState([])
  const [productosMasVendidos, setProductosMasVendidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingGrafico, setLoadingGrafico] = useState(false)
  const [mostrarModalDetalles, setMostrarModalDetalles] = useState(false)
  const [ventaDetalle, setVentaDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        setLoadingGrafico(true)
        
        // Obtener ventas del día (usar zona horaria de CDMX para coincidir con el backend)
        // El backend usa America/Mexico_City, así que necesitamos usar la fecha local
        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }) // Formato YYYY-MM-DD
        console.log('[Dashboard] Obteniendo ventas del día (CDMX):', hoy)
        const ventasHoy = await obtenerVentas(hoy, hoy).catch(err => {
          console.error('[Dashboard] Error al obtener ventas:', err)
          return []
        })
        console.log('[Dashboard] Ventas obtenidas:', ventasHoy)
        console.log('[Dashboard] Cantidad de ventas:', ventasHoy?.length || 0)
        if (ventasHoy && ventasHoy.length > 0) {
          console.log('[Dashboard] Primera venta:', ventasHoy[0])
          console.log('[Dashboard] Detalles primera venta:', ventasHoy[0]?.detalles)
          console.log('[Dashboard] Total primera venta:', ventasHoy[0]?.total)
        } else {
          console.log('[Dashboard] No hay ventas para el día:', hoy)
          // Intentar obtener todas las ventas para ver si hay algún problema
          const todasVentas = await obtenerVentas().catch(() => [])
          console.log('[Dashboard] Total de ventas en el sistema:', todasVentas?.length || 0)
          if (todasVentas && todasVentas.length > 0) {
            console.log('[Dashboard] Última venta:', todasVentas[0])
            console.log('[Dashboard] Fecha última venta:', todasVentas[0]?.fecha_venta)
          }
        }
        setVentas(ventasHoy || [])

        // Obtener comandas activas
        const comandasActivas = await obtenerComandas('pendiente').catch(err => {
          console.error('Error al obtener comandas activas:', err)
          return []
        })
        const comandasEnPreparacion = await obtenerComandas('en_preparacion').catch(err => {
          console.error('Error al obtener comandas en preparación:', err)
          return []
        })
        setComandas([...(comandasActivas || []), ...(comandasEnPreparacion || [])])

        // Obtener ventas de la semana (últimos 7 días)
        const fechaFin = new Date()
        const fechaInicio = new Date()
        fechaInicio.setDate(fechaInicio.getDate() - 7)
        const ventasSemanaData = await obtenerVentasPorDia(
          fechaInicio.toISOString().split('T')[0],
          fechaFin.toISOString().split('T')[0]
        )
        setVentasSemana(ventasSemanaData || [])
        
        // Obtener productos más vendidos (últimos 30 días para tener un buen rango)
        const fechaFinProductos = new Date()
        const fechaInicioProductos = new Date()
        fechaInicioProductos.setDate(fechaInicioProductos.getDate() - 30)
        const productosMasVendidosData = await obtenerProductosMasVendidos(
          fechaInicioProductos.toISOString().split('T')[0],
          fechaFinProductos.toISOString().split('T')[0],
          5
        )
        setProductosMasVendidos(productosMasVendidosData || [])
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error)
        // Asegurarse de que los estados estén vacíos si hay error
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

  // Calcular estadísticas
  console.log('[Dashboard] Calculando estadísticas con ventas:', ventas.length)
  const ventasDelDia = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const ordenesActivas = comandas.length
  const pedidosDelDia = ventas.length // Número de pedidos/ventas del día
  const productosVendidosDelDia = ventas.reduce((sum, v) => {
    // Sumar las cantidades de todos los detalles de productos en cada venta
    const detallesSum = v.detalles?.reduce((dSum, d) => dSum + (d.cantidad || 0), 0) || 0
    console.log('[Dashboard] Venta ID:', v.id_venta, 'Detalles:', v.detalles, 'Sum:', detallesSum)
    return sum + detallesSum
  }, 0)
  console.log('[Dashboard] Estadísticas calculadas:')
  console.log('  - Ventas del día:', ventasDelDia)
  console.log('  - Pedidos del día:', pedidosDelDia)
  console.log('  - Productos vendidos:', productosVendidosDelDia)

  // Abrir modal de detalles
  const abrirModalDetalles = async (idVenta) => {
    setMostrarModalDetalles(true)
    setCargandoDetalle(true)
    setVentaDetalle(null)
    
    try {
      const ventaCompleta = await obtenerVenta(idVenta)
      console.log('[Dashboard] Venta completa obtenida:', ventaCompleta)
      setVentaDetalle(ventaCompleta)
    } catch (error) {
      console.error('[Dashboard] Error al obtener detalles de venta:', error)
    } finally {
      setCargandoDetalle(false)
    }
  }

  // Número del día para ventas (1, 2, 3... se reinicia cada día)
  const ventasConNumeroDia = [...ventas]
    .sort((a, b) => (a.id_venta || 0) - (b.id_venta || 0))
    .map((v, i) => ({ ...v, numero_dia: i + 1 }))

  // Formatear fecha para gráficos (evitar desfase: tratar YYYY-MM-DD como fecha local)
  const formatearFechaSemana = (fechaStr) => {
    if (!fechaStr) return ''
    const parts = String(fechaStr).split('T')[0].split('-')
    if (parts.length !== 3) return fechaStr
    const fecha = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    return fecha.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' })
  }

  const stats = [
    {
      title: 'Ventas del Día',
      value: `$${ventasDelDia.toFixed(2)}`,
      change: `${ventas.length} ventas`,
      icon: DollarSign,
      color: 'matcha',
    },
    {
      title: 'Órdenes Activas',
      value: ordenesActivas.toString(),
      change: 'En cocina',
      icon: Package,
      color: 'coffee',
    },
    {
      title: 'Pedidos del Día',
      value: pedidosDelDia.toString(),
      change: 'Hoy',
      icon: ShoppingCart,
      color: 'green',
    },
    {
      title: 'Productos Vendidos',
      value: productosVendidosDelDia.toString(),
      change: 'Hoy',
      icon: Package,
      color: 'coffee',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Resumen general de tu cafetería</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const colorClasses = {
            matcha: 'bg-matcha-100 text-matcha-600',
            coffee: 'bg-coffee-100 text-coffee-600',
            green: 'bg-green-100 text-green-600',
          }

          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stat.change}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráficos y actividades recientes */}
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
                  formatter={(value) => `$${value.toFixed(2)}`}
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

      {/* Ventas recientes */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Ventas Recientes
        </h2>
        <div className="space-y-3">
          {ventasConNumeroDia.slice(0, 5).map((venta) => {
            const fecha = new Date(venta.fecha_venta)
            const tiempoTranscurrido = Math.floor((Date.now() - fecha.getTime()) / 60000) // minutos
            let tiempoTexto = ''
            if (tiempoTranscurrido < 60) {
              tiempoTexto = `Hace ${tiempoTranscurrido} min`
            } else if (tiempoTranscurrido < 1440) {
              tiempoTexto = `Hace ${Math.floor(tiempoTranscurrido / 60)} horas`
            } else {
              tiempoTexto = fecha.toLocaleDateString('es-MX')
            }
            return (
              <div key={venta.id_venta} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Venta #{venta.numero_dia ?? venta.id_venta}</p>
                  <p className="text-sm text-gray-500">
                    {venta.metodo_pago} - ${parseFloat(venta.total).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-gray-400">{tiempoTexto}</p>
                  <button
                    onClick={() => abrirModalDetalles(venta.id_venta)}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-matcha-600  border border-matcha-200 rounded-lg hover:bg-matcha-100 hover:border-matcha-300 transition-all duration-200"
                    title="Ver detalles"
                  >
                    Ver más detalles
                  </button>
                </div>
              </div>
            )
          })}
          {ventas.length === 0 && (
            <p className="text-center text-gray-500 py-4">No hay ventas recientes</p>
          )}
        </div>
      </div>

      {/* Modal de Detalles de Venta */}
      {mostrarModalDetalles && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-2xl font-bold text-gray-900">
                Detalles de Venta #{ventaDetalle ? (ventasConNumeroDia.find(v => v.id_venta === ventaDetalle.id_venta)?.numero_dia ?? ventaDetalle.id_venta) : ''}
              </h2>
              <button
                onClick={() => setMostrarModalDetalles(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6">
              {cargandoDetalle ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
                </div>
              ) : ventaDetalle ? (
                <div className="space-y-6">
                  {/* Información General */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Cliente:</p>
                      <p className="font-medium text-gray-900">
                        {ventaDetalle.nombre_cliente}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Fecha</p>
                      <p className="font-medium text-gray-900">
                        {new Date(ventaDetalle.fecha_venta).toLocaleString('es-MX')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Método de Pago</p>
                      <p className="font-medium text-gray-900 capitalize">
                        {ventaDetalle.metodo_pago}
                      </p>
                    </div>
                    {ventaDetalle.tipo_servicio && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Tipo de Servicio</p>
                        <p className="font-medium text-gray-900 capitalize">
                          {ventaDetalle.tipo_servicio === 'comer-aqui' ? 'Comer aquí' : 'Para llevar'}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total</p>
                      <p className="text-xl font-bold text-matcha-600">
                        ${parseFloat(ventaDetalle.total || 0).toFixed(2)}
                      </p>
                    </div>
                    {(ventaDetalle.total_descuento != null && parseFloat(ventaDetalle.total_descuento) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Descuento</p>
                        <p className="font-medium text-gray-900">
                          -${parseFloat(ventaDetalle.total_descuento).toFixed(2)}
                          {ventaDetalle.descuento_tipo === 'porcentaje' && ventaDetalle.descuento_valor != null && (
                            <span className="text-gray-500 text-sm ml-1">({ventaDetalle.descuento_valor}%)</span>
                          )}
                        </p>
                      </div>
                    )}
                    {(ventaDetalle.monto_propina != null && parseFloat(ventaDetalle.monto_propina) > 0) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Propina</p>
                        <p className="font-medium text-gray-900">
                          +${parseFloat(ventaDetalle.monto_propina).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tipo de Leche Global (si existe) */}
                  {(ventaDetalle.tipo_leche || ventaDetalle.extra_leche) && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm font-semibold text-gray-900 mb-2">Opciones de Leche</p>
                      {ventaDetalle.tipo_leche && (
                        <p className="text-sm text-gray-700">
                          Tipo: <span className="font-medium capitalize">{ventaDetalle.tipo_leche}</span>
                        </p>
                      )}
                      {ventaDetalle.extra_leche && parseFloat(ventaDetalle.extra_leche) > 0 && (
                        <p className="text-sm text-gray-700">
                          Extra: <span className="font-medium">${parseFloat(ventaDetalle.extra_leche).toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Comentarios */}
                  {ventaDetalle.comentarios && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm font-semibold text-gray-900 mb-1">Comentarios</p>
                      <p className="text-sm text-gray-700 italic">{ventaDetalle.comentarios}</p>
                    </div>
                  )}

                  {/* Productos Vendidos */}
                  <div>
                    <p className="text-lg font-semibold text-gray-900 mb-4">Productos Vendidos</p>
                    <div className="space-y-3">
                      {ventaDetalle.detalles && ventaDetalle.detalles.length > 0 ? (
                        ventaDetalle.detalles.map((detalle, index) => {
                          const producto = productos.find(p => p.id_producto === detalle.id_producto)
                          const nombreProducto = (detalle.id_producto == null || detalle.id_producto === '')
                            ? (detalle.nombre_producto || 'Producto personalizado')
                            : (producto?.nombre || `Producto #${detalle.id_producto}`)
                          
                          // Parsear observaciones
                          const observaciones = detalle.observaciones ? detalle.observaciones.split(' - ') : []
                          const tipoLecheObs = observaciones.find(obs => obs.includes('Leche'))
                          const extrasObs = observaciones.find(obs => obs.includes('Extras:'))
                          const otrasObs = observaciones.filter(obs => !obs.includes('Leche') && !obs.includes('Extras:'))
                          
                          return (
                            <div
                              key={index}
                              className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{nombreProducto}</p>
                                  <p className="text-sm text-gray-600">
                                    Cantidad: {detalle.cantidad} x ${parseFloat(detalle.precio_unitario || 0).toFixed(2)} = ${parseFloat(detalle.subtotal || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Tipo de Leche */}
                              {tipoLecheObs && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                    {tipoLecheObs}
                                  </span>
                                </div>
                              )}
                              
                              {/* Extras */}
                              {extrasObs && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300">
                                    {extrasObs}
                                  </span>
                                </div>
                              )}
                              
                              {/* Otras observaciones */}
                              {otrasObs.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {otrasObs.map((obs, obsIndex) => (
                                    <p key={obsIndex} className="text-xs text-gray-600 italic">{obs}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-center text-gray-500 py-4">No hay productos en esta venta</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No se pudieron cargar los detalles de la venta</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard


