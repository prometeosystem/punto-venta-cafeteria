import { Search, Eye, Filter } from 'lucide-react'

const Pedidos = () => {
  const orders = [
    {
      id: '#1234',
      customer: 'María González',
      items: 3,
      total: 65.00,
      status: 'completado',
      date: '2024-12-15 10:30',
    },
    {
      id: '#1235',
      customer: 'Juan Pérez',
      items: 2,
      total: 40.00,
      status: 'en_proceso',
      date: '2024-12-15 11:15',
    },
    {
      id: '#1236',
      customer: 'Ana Martínez',
      items: 4,
      total: 95.00,
      status: 'pendiente',
      date: '2024-12-15 11:45',
    },
    {
      id: '#1237',
      customer: 'Carlos López',
      items: 1,
      total: 20.00,
      status: 'completado',
      date: '2024-12-15 12:00',
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'completado':
        return 'bg-green-100 text-green-700'
      case 'en_proceso':
        return 'bg-yellow-100 text-yellow-700'
      case 'pendiente':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completado':
        return 'Completado'
      case 'en_proceso':
        return 'En Proceso'
      case 'pendiente':
        return 'Pendiente'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pedidos</h1>
        <p className="text-gray-600 mt-1">Gestiona todos los pedidos</p>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de pedido o cliente..."
              className="input pl-10"
            />
          </div>
          <select className="input md:w-48">
            <option>Todos los estados</option>
            <option>Pendiente</option>
            <option>En Proceso</option>
            <option>Completado</option>
          </select>
          <button className="btn-outline flex items-center gap-2 md:w-auto">
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Pedido
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Cliente
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Items
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Total
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Estado
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">
                  Fecha
                </th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-medium text-matcha-600">{order.id}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-900">{order.customer}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-600">{order.items}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-gray-900">
                      ${order.total.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">{order.date}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end">
                      <button
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Ver detalles"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
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

export default Pedidos

