import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Calendar, Loader2 } from 'lucide-react'
import { useVentas } from '../hooks/useVentas'

const Reportes = () => {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(false)
  const { obtenerVentas } = useVentas()

  // Establecer fechas por defecto (mes actual)
  useEffect(() => {
    const hoy = new Date()
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
    setFechaInicio(primerDiaMes.toISOString().split('T')[0])
    setFechaFin(hoy.toISOString().split('T')[0])
  }, [])

  // Cargar ventas cuando cambian las fechas
  useEffect(() => {
    if (fechaInicio && fechaFin) {
      cargarVentas()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaInicio, fechaFin])

  const cargarVentas = async () => {
    setLoading(true)
    try {
      const data = await obtenerVentas(fechaInicio, fechaFin)
      setVentas(data || [])
    } catch (error) {
      console.error('Error al cargar ventas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const ventasTotales = ventas.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
  const pedidosTotales = ventas.length
  const ticketPromedio = pedidosTotales > 0 ? ventasTotales / pedidosTotales : 0
  const productosVendidos = ventas.reduce((sum, v) => {
    return sum + (v.detalles?.reduce((dSum, d) => dSum + d.cantidad, 0) || 0)
  }, 0)
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600 mt-1">Análisis y estadísticas de tu negocio</p>
      </div>

      {/* Filtros de fecha */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Inicio
              </label>
              <input 
                type="date" 
                className="input" 
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input 
                type="date" 
                className="input" 
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
          </div>
          <button 
            onClick={cargarVentas}
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Calendar className="w-4 h-4" />
            {loading ? 'Cargando...' : 'Generar Reporte'}
          </button>
        </div>
      </div>

      {/* Resumen de reportes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ventas Totales</p>
                <p className="text-2xl font-bold text-gray-900">${ventasTotales.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Período seleccionado
                </p>
              </div>
              <div className="p-3 bg-matcha-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-matcha-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Productos Vendidos</p>
                <p className="text-2xl font-bold text-gray-900">{productosVendidos}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Unidades totales
                </p>
              </div>
              <div className="p-3 bg-coffee-100 rounded-lg">
                <Package className="w-6 h-6 text-coffee-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900">${ticketPromedio.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Por venta
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pedidos Totales</p>
                <p className="text-2xl font-bold text-gray-900">{pedidosTotales}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Ventas realizadas
                </p>
              </div>
              <div className="p-3 bg-matcha-100 rounded-lg">
                <Package className="w-6 h-6 text-matcha-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Ventas por Día
          </h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Gráfico de ventas diarias (integrar con librería de gráficos)</p>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Productos Más Vendidos
          </h2>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <p>Gráfico de productos (integrar con librería de gráficos)</p>
          </div>
        </div>
      </div>

      {/* Tabla de reporte detallado */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Reporte Detallado
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Fecha
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ventas
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Pedidos
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Ticket Promedio
                </th>
              </tr>
            </thead>
            <tbody>
              {ventas.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    No hay ventas en el período seleccionado
                  </td>
                </tr>
              ) : (
                ventas.slice(0, 20).map((venta) => {
                  const fecha = new Date(venta.fecha_venta)
                  const fechaFormateada = fecha.toLocaleDateString('es-MX')
                  const productosEnVenta = venta.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
                  return (
                    <tr
                      key={venta.id_venta}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4 text-gray-900">{fechaFormateada}</td>
                      <td className="py-3 px-4 font-semibold text-matcha-600">
                        ${parseFloat(venta.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{productosEnVenta}</td>
                      <td className="py-3 px-4 text-gray-600">
                        ${parseFloat(venta.total).toFixed(2)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reportes




