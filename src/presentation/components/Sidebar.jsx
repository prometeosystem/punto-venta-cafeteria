import { NavLink, useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { useAuth } from '../context/AuthContext'
import { usePrinterContext } from '../context/PrinterContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { hasRouteAccess } from '../utils/rolePermissions'
import marca from '@marca'
import PrinterConnectionButton from './PrinterConnectionButton'
import NotificationsBell from './NotificationsBell'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  X,
  Coffee,
  FileText,
  Wallet,
  ArrowLeftRight,
  Calculator,
  PanelTop,
  Maximize,
  Minimize,
  ChevronLeft,
  LogOut,
} from 'lucide-react'

import { User as UserIcon } from 'lucide-react'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/punto-venta', icon: ShoppingCart, label: 'Punto de Venta' },
  { path: '/barista', icon: Coffee, label: 'Comandas' },
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/inventario', icon: Warehouse, label: 'Insumos' },
  { path: '/empleados', icon: UserIcon, label: 'Empleados' },
  { path: '/caja', icon: Wallet, label: 'Caja' },
  { path: '/movimientos-caja', icon: ArrowLeftRight, label: 'Movimientos' },
  { path: '/contabilidad', icon: Calculator, label: 'Contabilidad' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/bitacora', icon: FileText, label: 'Bitácora' },
  { path: '/configuracion', icon: Settings, label: 'Configuración' },
]

const ICONO_SIDEBAR =
  'p-2.5 rounded-lg text-gray-300 hover:bg-pino-700 hover:text-white transition-colors'

const Sidebar = () => {
  const {
    sidebarOpen,
    toggleSidebar,
    headerVisible,
    toggleHeader,
    isFullscreen,
    toggleFullscreen,
    fullscreenSupported,
  } = useLayout()
  const { usuario, logout } = useAuth()
  const printer = usePrinterContext()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 1023px)')

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

  // Filtrar items del menú según el rol del usuario
  const filteredMenuItems = menuItems.filter(item => {
    if (!usuario || !usuario.rol) return false
    return hasRouteAccess(usuario.rol, item.path)
  })

  return (
    <>
      {/* Overlay para cerrar sidebar (solo en móvil) */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          w-64 bg-pino-800 border-r border-pino-900
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isMobile ? '' : sidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
          flex flex-col
          shadow-lg lg:shadow-none
        `}
      >
        {/* Header del Sidebar */}
        <div className="relative flex items-center justify-center px-12 py-5 border-b border-pino-700">
          <marca.Logo className="w-40 text-white" />
          <button
            onClick={toggleSidebar}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-pino-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredMenuItems.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              No hay opciones disponibles
            </div>
          ) : (
            filteredMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-matcha-500 text-white font-medium'
                        : 'text-gray-300 hover:bg-pino-700 hover:text-white'
                    }`
                  }
                  onClick={() => {
                    // En pantallas chicas el sidebar tapa la vista; en grandes se queda abierto
                    if (isMobile) toggleSidebar()
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })
          )}
        </nav>

        {/* Footer del Sidebar */}
        <div className="px-4 pt-3 pb-2 border-t border-pino-700">
          {/* Controles que antes vivían en la barra superior */}
          <div className="flex items-center gap-1 mb-2">
            <PrinterConnectionButton printer={printer} iconOnly className="hover:bg-pino-700" />

            <NotificationsBell variant="sidebar" />

            <button
              onClick={toggleHeader}
              className={ICONO_SIDEBAR}
              title={headerVisible ? 'Ocultar barra superior' : 'Mostrar barra superior'}
              aria-label={headerVisible ? 'Ocultar barra superior' : 'Mostrar barra superior'}
            >
              <PanelTop className="w-5 h-5" />
            </button>

            {fullscreenSupported && (
              <button
                onClick={toggleFullscreen}
                className={ICONO_SIDEBAR}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            )}

            <button
              onClick={toggleSidebar}
              className={ICONO_SIDEBAR}
              title="Cerrar menú"
              aria-label="Cerrar menú"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <NavLink
              to="/mi-perfil"
              onClick={() => {
                if (isMobile) toggleSidebar()
              }}
              title="Mi perfil"
              className={({ isActive }) =>
                `flex-1 min-w-0 flex items-center gap-2 p-1.5 -ml-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-pino-700' : 'hover:bg-pino-700'
                }`
              }
            >
              <div className="w-9 h-9 shrink-0 bg-matcha-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">{getInitials()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{getFullName()}</div>
                <div className="text-xs text-gray-400 truncate">Mi perfil</div>
              </div>
            </NavLink>
            <button
              onClick={handleLogout}
              className="shrink-0 p-2 rounded-lg text-red-300 hover:bg-red-500/15 hover:text-red-200 transition-colors"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="text-[11px] text-gray-500 text-center mt-1.5">
            v5.1.1 · Desarrollado por Prothec
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

