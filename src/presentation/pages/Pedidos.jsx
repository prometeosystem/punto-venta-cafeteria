import { useState, useEffect } from 'react'
import { Search, Eye, Filter, Loader2 } from 'lucide-react'
import { usePreordenes } from '../hooks/usePreordenes'

const Pedidos = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('Todos los estados')
  const [preordenes, setPreordenes] = useState([])
  const { obtenerPreordenes, loading } = usePreordenes()

  useEffect(() => {
    const cargarPreordenes = async () => {
      try {
        const estado = selectedStatus !== 'Todos los estados' ? selectedStatus.toLowerCase() : null
        const data = await obtenerPreordenes(estado)
        setPreordenes(data)
      } catch (error) {
        console.error('Error al cargar pre-órdenes:', error)
      }
    }
    cargarPreordenes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStatus])

  // Filtrar pre-órdenes
  const filteredOrders = preordenes.filter((order) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      order.nombre_cliente?.toLowerCase().includes(searchLower) ||
      order.id_preorden?.toString().includes(searchTerm)
    )
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'entregada':
      case 'pagada':
        return 'bg-green-100 text-green-700'
      case 'en_cocina':
      case 'en_caja':
        return 'bg-yellow-100 text-yellow-700'
      case 'preorden':
        return 'bg-blue-100 text-blue-700'
      case 'lista':
        return 'bg-purple-100 text-purple-700'
      case 'cancelada':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      preorden: 'Pre-orden',
      en_caja: 'En Caja',
      pagada: 'Pagada',
      en_cocina: 'En Cocina',
      lista: 'Lista',
      entregada: 'Entregada',
      cancelada: 'Cancelada',
    }
    return labels[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="input md:w-48"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option>Todos los estados</option>
            <option>preorden</option>
            <option>en_caja</option>
            <option>pagada</option>
            <option>en_cocina</option>
            <option>lista</option>
            <option>entregada</option>
            <option>cancelada</option>
          </select>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
          </div>
        ) : (
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-gray-500">
                      No se encontraron pedidos
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const itemsCount = order.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
                    return (
                      <tr
                        key={order.id_preorden}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium text-matcha-600">
                            #{order.id_preorden}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900">{order.nombre_cliente}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-600">{itemsCount}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-gray-900">
                            ${parseFloat(order.total || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.estado
                            )}`}
                          >
                            {getStatusLabel(order.estado)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-gray-600">
                            {formatDate(order.fecha_creacion)}
                          </span>
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
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Pedidos




