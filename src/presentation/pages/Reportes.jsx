import { TrendingUp, DollarSign, Package, Calendar } from 'lucide-react'

const Reportes = () => {
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
              <input type="date" className="input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha Fin
              </label>
              <input type="date" className="input" />
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Generar Reporte
          </button>
        </div>
      </div>

      {/* Resumen de reportes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900">$45,230</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +15.3% vs mes anterior
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
              <p className="text-2xl font-bold text-gray-900">1,234</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.7% vs mes anterior
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
              <p className="text-2xl font-bold text-gray-900">$36.65</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +2.1% vs mes anterior
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
              <p className="text-2xl font-bold text-gray-900">1,234</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.4% vs mes anterior
              </p>
            </div>
            <div className="p-3 bg-matcha-100 rounded-lg">
              <Package className="w-6 h-6 text-matcha-600" />
            </div>
          </div>
        </div>
      </div>

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
              {[
                { date: '2024-12-15', sales: 1250, orders: 34, avg: 36.76 },
                { date: '2024-12-14', sales: 1180, orders: 32, avg: 36.88 },
                { date: '2024-12-13', sales: 1320, orders: 36, avg: 36.67 },
              ].map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4 text-gray-900">{row.date}</td>
                  <td className="py-3 px-4 font-semibold text-matcha-600">
                    ${row.sales.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{row.orders}</td>
                  <td className="py-3 px-4 text-gray-600">
                    ${row.avg.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Reportes

