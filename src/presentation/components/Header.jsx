import { useState, useRef, useEffect } from 'react'
import { Menu, LogOut, ChevronUp, Maximize, Minimize } from 'lucide-react'
import { useLayout } from '../context/LayoutContext'
import { useAuth } from '../context/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import PrinterConnectionButton from './PrinterConnectionButton'
import NotificationsBell from './NotificationsBell'
import { usePrinterContext } from '../context/PrinterContext'

const ROUTE_TITLES = {
  '/dashboard': 'Dashboard',
  '/punto-venta': 'Punto de Venta',
  '/caja': 'Caja',
  '/historial-caja': 'Historial de Caja',
  '/movimientos-caja': 'Movimientos',
  '/categorias-movimiento': 'Categorías de Movimiento',
  '/barista': 'Comandas',
  '/productos': 'Productos',
  '/inventario': 'Inventario',
  '/loyabit': 'Loyabit',
  '/empleados': 'Empleados',
  '/reportes': 'Reportes',
  '/contabilidad': 'Contabilidad',
  '/bitacora': 'Bitácora',
  '/configuracion': 'Configuración',
  '/test-sonidos': 'Prueba de Sonidos',
  '/pedidos': 'Pedidos',
  '/clientes': 'Clientes',
}

const Header = () => {
  const { sidebarOpen, toggleSidebar, toggleHeader, isFullscreen, toggleFullscreen, fullscreenSupported } = useLayout()
  const { usuario, logout } = useAuth()
  const printer = usePrinterContext()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [showDropdown, setShowDropdown] = useState(false)
  const userDropdownRef = useRef(null)

  const pageTitle = ROUTE_TITLES[pathname] || 'Punto de Cafetería'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getInitials = () => {
    if (!usuario) return 'U'
    const nombre = usuario.nombre || ''
    const apellido = usuario.apellido_paterno || ''
    return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase() || 'U'
  }

  const getFullName = () => {
    if (!usuario) return 'Usuario'
    return `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() || 'Usuario'
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        <div className="flex items-center gap-3 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <h1 className="text-xl font-semibold text-coffee-800 truncate">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3 ml-auto shrink-0">
          <PrinterConnectionButton printer={printer} />

          {fullscreenSupported && (
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize className="w-5 h-5 text-gray-600" />
              )}
            </button>
          )}

          <button
            onClick={toggleHeader}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Ocultar barra superior"
            aria-label="Ocultar barra superior"
          >
            <ChevronUp className="w-5 h-5 text-gray-600" />
          </button>

          <NotificationsBell />

          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2 transition-colors"
            >
              <div className="w-10 h-10 bg-matcha-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{getInitials()}</span>
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-gray-900">{getFullName()}</div>
                <div className="text-xs text-gray-500 capitalize">{usuario?.rol || 'Usuario'}</div>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                <div className="px-4 py-2 border-b border-gray-200">
                  <div className="text-sm font-semibold text-gray-900">{getFullName()}</div>
                  <div className="text-xs text-gray-500">{usuario?.correo || ''}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
