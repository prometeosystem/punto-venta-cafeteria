import { useState } from 'react'
import { Plus, Search, Mail, Phone, Clock, Users, DollarSign, Sun, Loader2 } from 'lucide-react'
import { useUsuarios } from '../hooks/useUsuarios'

const Empleados = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const { usuarios, loading } = useUsuarios()

  // Filtrar empleados
  const filteredEmployees = usuarios.filter((user) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      user.nombre?.toLowerCase().includes(searchLower) ||
      user.apellido_paterno?.toLowerCase().includes(searchLower) ||
      user.correo?.toLowerCase().includes(searchLower) ||
      user.rol?.toLowerCase().includes(searchLower)
    )
  })

  // Filtrar solo empleados activos
  const empleadosActivos = usuarios.filter(u => u.activo)

  // Formatear nombre completo
  const getFullName = (usuario) => {
    return `${usuario.nombre || ''} ${usuario.apellido_paterno || ''} ${usuario.apellido_materno || ''}`.trim()
  }

  const stats = [
    { 
      title: 'Total Empleados', 
      value: empleadosActivos.length.toString(), 
      subtitle: 'Empleados activos', 
      icon: Users,
      color: 'bg-blue-100 text-blue-600'
    },
    { 
      title: 'Vendedores', 
      value: empleadosActivos.filter(u => u.rol === 'vendedor').length.toString(), 
      subtitle: 'Activos', 
      icon: Users,
      color: 'bg-green-100 text-green-600'
    },
    { 
      title: 'Cocina', 
      value: empleadosActivos.filter(u => u.rol === 'cocina').length.toString(), 
      subtitle: 'Empleados', 
      icon: Users,
      color: 'bg-orange-100 text-orange-600'
    },
    { 
      title: 'Administradores', 
      value: empleadosActivos.filter(u => u.rol === 'administrador' || u.rol === 'superadministrador').length.toString(), 
      subtitle: 'Empleados', 
      icon: Users,
      color: 'bg-purple-100 text-purple-600'
    },
  ]

  const getRolColor = (rol) => {
    switch (rol) {
      case 'vendedor':
        return 'bg-green-100 text-green-700'
      case 'cocina':
        return 'bg-orange-100 text-orange-700'
      case 'administrador':
        return 'bg-purple-100 text-purple-700'
      case 'superadministrador':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cocina: 'Cocina',
      administrador: 'Administrador',
      superadministrador: 'Super Administrador',
    }
    return labels[rol] || rol
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-1">Gestión de personal y turnos</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuevo Empleado
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
                  <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
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
            placeholder="Buscar empleados..."
            className="input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de empleados */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              No se encontraron empleados
            </div>
          ) : (
            filteredEmployees.map((employee) => {
              const initials = `${employee.nombre?.charAt(0) || ''}${employee.apellido_paterno?.charAt(0) || ''}`.toUpperCase() || 'U'
              return (
                <div key={employee.id_usuario} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-matcha-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-lg">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getFullName(employee)}
                      </h3>
                      <p className="text-sm text-gray-600">{getRolLabel(employee.rol)}</p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRolColor(
                          employee.rol
                        )}`}
                      >
                        {employee.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-200 pt-4">
                    {employee.correo && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{employee.correo}</span>
                      </div>
                    )}
                    {employee.celular && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{employee.celular}</span>
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

export default Empleados



