import { useState } from 'react'
import { Plus, Search, Mail, Phone, Calendar, MapPin, Gift, Loader2, Users, Star } from 'lucide-react'
import { useClientes } from '../hooks/useClientes'

const Clientes = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const { clientes, loading } = useClientes()

  // Filtrar clientes
  const filteredClients = clientes.filter((client) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      client.nombre?.toLowerCase().includes(searchLower) ||
      client.apellido_paterno?.toLowerCase().includes(searchLower) ||
      client.apellido_materno?.toLowerCase().includes(searchLower) ||
      client.correo?.toLowerCase().includes(searchLower) ||
      client.celular?.includes(searchTerm)
    )
  })

  // Calcular tier basado en puntos
  const getTier = (puntos) => {
    if (puntos >= 500) return 'Oro'
    if (puntos >= 200) return 'Plata'
    return 'Bronce'
  }

  // Formatear nombre completo
  const getFullName = (cliente) => {
    return `${cliente.nombre || ''} ${cliente.apellido_paterno || ''} ${cliente.apellido_materno || ''}`.trim()
  }

  // Calcular estadísticas
  const stats = [
    { 
      title: 'Total Clientes', 
      value: clientes.length.toString(), 
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      title: 'Clientes Oro', 
      value: clientes.filter(c => getTier(parseFloat(c.puntos || 0)) === 'Oro').length.toString(), 
      icon: Gift,
      color: 'bg-yellow-100 text-yellow-600'
    },
    { 
      title: 'Clientes Plata', 
      value: clientes.filter(c => getTier(parseFloat(c.puntos || 0)) === 'Plata').length.toString(), 
      icon: Gift,
      color: 'bg-gray-100 text-gray-600'
    },
    { 
      title: 'Total Puntos', 
      value: clientes.reduce((sum, c) => sum + parseFloat(c.puntos || 0), 0).toFixed(0), 
      icon: Star,
      color: 'bg-matcha-100 text-matcha-600'
    },
  ]

  const getTierColor = (tier) => {
    switch (tier) {
      case 'Oro':
        return 'bg-yellow-100 text-yellow-700'
      case 'Plata':
        return 'bg-gray-100 text-gray-700'
      case 'Bronce':
        return 'bg-coffee-100 text-coffee-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes CRM</h1>
          <p className="text-gray-600 mt-1">Gestiona tus clientes y programa de fidelidad</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuevo Cliente
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Búsqueda */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de clientes */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No se encontraron clientes
            </div>
          ) : (
            filteredClients.map((client) => {
              const tier = getTier(parseFloat(client.puntos || 0))
              return (
                <div key={client.id_cliente} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getFullName(client)}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-matcha-600">
                          {parseFloat(client.puntos || 0).toFixed(0)} puntos
                        </span>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(tier)}`}
                        >
                          {tier}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    {client.correo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{client.correo}</span>
                      </div>
                    )}
                    {client.celular && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{client.celular}</span>
                      </div>
                    )}
                    {client.direccion && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate">{client.direccion}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button className="btn-outline w-full text-sm py-2">
                      Ver Detalles
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default Clientes


