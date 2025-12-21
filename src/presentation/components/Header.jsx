import { Menu, Bell, Search, User } from 'lucide-react'
import { useLayout } from '../context/LayoutContext'

const Header = () => {
  const { toggleSidebar } = useLayout()

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Botón menú móvil */}
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* Búsqueda */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos, clientes..."
              className="input pl-10 w-full"
            />
          </div>
        </div>

        {/* Acciones del usuario */}
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
            aria-label="Notificaciones"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Perfil de usuario"
          >
            <div className="w-8 h-8 bg-matcha-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700">
              Usuario
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header

