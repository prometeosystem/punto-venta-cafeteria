import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Users, Loader2 } from 'lucide-react'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { useClientes } from '../hooks/useClientes'
import { useProductos } from '../hooks/useProductos'
import { useReportes } from '../hooks/useReportes'
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
  const { obtenerVentas } = useVentas()
  const { obtenerComandas } = useComandas()
  const { clientes } = useClientes()
  const { productos } = useProductos()
  const { obtenerVentasPorDia } = useReportes()
  const [ventas, setVentas] = useState([])
  const [comandas, setComandas] = useState([])
  const [ventasSemana, setVentasSemana] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingGrafico, setLoadingGrafico] = useState(false)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        setLoadingGrafico(true)
        
        // Obtener ventas del día
        const hoy = new Date().toISOString().split('T')[0]
        const ventasHoy = await obtenerVentas(hoy, hoy)
        setVentas(ventasHoy || [])

        // Obtener comandas activas
        const comandasActivas = await obtenerComandas('pendiente')
        const comandasEnPreparacion = await obtenerComandas('en_preparacion')
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
      } catch (error) {
        console.error('Error al cargar datos del dashboard:', error)
      } finally {
        setLoading(false)
        setLoadingGrafico(false)
      }
    }
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Calcular estadísticas
  const ventasDelDia = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const ordenesActivas = comandas.length
  const productosActivos = productos.filter(p => p.activo).length

  // Formatear fecha para gráficos
  const formatearFechaSemana = (fechaStr) => {
    const fecha = new Date(fechaStr)
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
      title: 'Total Clientes',
      value: clientes.length.toString(),
      change: 'Registrados',
      icon: Users,
      color: 'green',
    },
    {
      title: 'Productos Activos',
      value: productosActivos.toString(),
      change: 'Disponibles',
      icon: Package,
      color: 'matcha',
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
                    const fecha = new Date(label)
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
            Productos Activos
          </h2>
          <div className="space-y-3">
            {productos.filter(p => p.activo).slice(0, 5).map((product) => (
              <div key={product.id_producto} className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.nombre}</p>
                  <p className="text-sm text-gray-500">{product.categoria}</p>
                </div>
                <p className="font-semibold text-matcha-600">
                  ${parseFloat(product.precio).toFixed(2)}
                </p>
              </div>
            ))}
            {productos.filter(p => p.activo).length === 0 && (
              <p className="text-center text-gray-500 py-4">No hay productos activos</p>
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
          {ventas.slice(0, 5).map((venta) => {
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
                <div>
                  <p className="font-medium text-gray-900">Venta #{venta.id_venta}</p>
                  <p className="text-sm text-gray-500">
                    {venta.metodo_pago} - ${parseFloat(venta.total).toFixed(2)}
                  </p>
                </div>
                <p className="text-xs text-gray-400">{tiempoTexto}</p>
              </div>
            )
          })}
          {ventas.length === 0 && (
            <p className="text-center text-gray-500 py-4">No hay ventas recientes</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard


