import { Plus, Search, Mail, Phone, Calendar } from 'lucide-react'

const Clientes = () => {
  const clients = [
    {
      id: 1,
      name: 'María González',
      email: 'maria@example.com',
      phone: '+52 555 123 4567',
      joinDate: '2024-01-15',
      totalOrders: 24,
      totalSpent: 1200,
    },
    {
      id: 2,
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+52 555 987 6543',
      joinDate: '2024-02-20',
      totalOrders: 18,
      totalSpent: 890,
    },
    {
      id: 3,
      name: 'Ana Martínez',
      email: 'ana@example.com',
      phone: '+52 555 456 7890',
      joinDate: '2024-03-10',
      totalOrders: 32,
      totalSpent: 1650,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona tu base de clientes</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Búsqueda */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar clientes por nombre, email o teléfono..."
            className="input pl-10"
          />
        </div>
      </div>

      {/* Lista de clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <div key={client.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {client.name}
                </h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    <span className="truncate max-w-[150px]">{client.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{client.phone}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Pedidos totales:</span>
                <span className="font-semibold text-gray-900">
                  {client.totalOrders}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Total gastado:</span>
                <span className="font-semibold text-matcha-600">
                  ${client.totalSpent.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                <Calendar className="w-3 h-3" />
                <span>Cliente desde {new Date(client.joinDate).toLocaleDateString('es-MX')}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button className="btn-outline w-full text-sm py-2">
                Ver Detalles
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Clientes

