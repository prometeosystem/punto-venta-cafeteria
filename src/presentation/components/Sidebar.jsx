import { NavLink } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import Logo from './Logo'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Menu,
  X,
  ExternalLink,
  Coffee,
} from 'lucide-react'

import { User as UserIcon } from 'lucide-react'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/punto-venta', icon: ShoppingCart, label: 'Punto de Venta' },
  { path: '/barista', icon: Coffee, label: 'Barista' },
  { path: '/productos', icon: Package, label: 'Productos' },
  { path: '/inventario', icon: Warehouse, label: 'Inventario' },
  // { path: '/clientes', icon: Users, label: 'Clientes' }, // Temporalmente oculto
  { path: '/loyabit', icon: ExternalLink, label: 'Loyabit' },
  { path: '/empleados', icon: UserIcon, label: 'Empleados' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  { path: '/configuracion', icon: Settings, label: 'Configuración' },
]

const Sidebar = () => {
  const { sidebarOpen, toggleSidebar } = useLayout()
  const isMobile = useMediaQuery('(max-width: 1023px)')

  return (
    <>
      {/* Overlay para móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-coffee-800 border-r border-coffee-900
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
          shadow-lg lg:shadow-none
        `}
      >
        {/* Header del Sidebar */}
        <div className="flex items-center justify-between p-6 border-b border-coffee-700">
          <Logo />
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-coffee-700 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-matcha-500 text-white font-medium'
                      : 'text-gray-300 hover:bg-coffee-700 hover:text-white'
                  }`
                }
                onClick={() => {
                  // Cerrar sidebar en móvil/tablet al hacer clic
                  if (isMobile) {
                    toggleSidebar()
                  }
                }}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-coffee-700">
          <div className="text-xs text-gray-400 text-center space-y-1">
            <div>v1.0.0</div>
            <div>Creado por Prothec</div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar

