import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useLayout } from '../context/LayoutContext'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import { usePrinterContext } from '../context/PrinterContext'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { hasRouteAccess } from '../utils/rolePermissions'
import { precargarVista } from '../router/precargarVistas'
import marca from '@marca'
import PrinterConnectionButton from './PrinterConnectionButton'
import NotificationsBell from './NotificationsBell'
import {
  LayoutDashboard,
  ShoppingCart,
  Armchair,
  Package,
  Warehouse,
  Truck,
  RotateCcw,
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
  ChevronRight,
  LogOut,
  UserRound,
} from 'lucide-react'

import { User as UserIcon } from 'lucide-react'

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', corto: 'Dashboard' },
  { path: '/punto-venta', icon: ShoppingCart, label: 'Punto de Venta', corto: 'Venta' },
  { path: '/mesas', icon: Armchair, label: 'Mesas', corto: 'Mesas' },
  { path: '/barista', icon: Coffee, label: 'Comandas', corto: 'Cocina' },
  { path: '/productos', icon: Package, label: 'Productos', corto: 'Prods.' },
  { path: '/inventario', icon: Warehouse, label: 'Insumos', corto: 'Insumos' },
  { path: '/proveedores', icon: Truck, label: 'Proveedores', corto: 'Provs.' },
  { path: '/devoluciones', icon: RotateCcw, label: 'Devoluciones', corto: 'Devs.' },
  { path: '/empleados', icon: UserIcon, label: 'Empleados', corto: 'Staff' },
  { path: '/caja', icon: Wallet, label: 'Caja', corto: 'Caja' },
  { path: '/movimientos-caja', icon: ArrowLeftRight, label: 'Movimientos', corto: 'Movs.' },
  { path: '/contabilidad', icon: Calculator, label: 'Contabilidad', corto: 'Conta.' },
  { path: '/reportes', icon: BarChart3, label: 'Reportes', corto: 'Reportes' },
  { path: '/bitacora', icon: FileText, label: 'Bitácora', corto: 'Bitácora' },
  { path: '/configuracion', icon: Settings, label: 'Configuración', corto: 'Config' },
]

const ICONO_SIDEBAR =
  'p-2.5 rounded-lg text-gray-300 hover:bg-oscuro-700 hover:text-white transition-colors'

const Sidebar = () => {
  const {
    sidebarOpen,
    sidebarCollapsed,
    toggleSidebar,
    openSidebar,
    headerVisible,
    toggleHeader,
    isFullscreen,
    toggleFullscreen,
    fullscreenSupported,
  } = useLayout()
  const { usuario, logout } = useAuth()
  const { preferencias } = usePreferencias()
  const printer = usePrinterContext()
  const navigate = useNavigate()
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const [menuPerfilAbierto, setMenuPerfilAbierto] = useState(false)
  const refPerfil = useRef(null)

  const handleLogout = () => {
    setMenuPerfilAbierto(false)
    logout()
    navigate('/login')
  }

  const irAPerfil = () => {
    setMenuPerfilAbierto(false)
    navigate('/mi-perfil')
    if (isMobile) toggleSidebar()
  }

  useEffect(() => {
    if (!menuPerfilAbierto) return undefined
    const alClicFuera = (e) => {
      if (refPerfil.current && !refPerfil.current.contains(e.target)) {
        setMenuPerfilAbierto(false)
      }
    }
    document.addEventListener('mousedown', alClicFuera)
    return () => document.removeEventListener('mousedown', alClicFuera)
  }, [menuPerfilAbierto])

  useEffect(() => {
    setMenuPerfilAbierto(false)
  }, [sidebarCollapsed, sidebarOpen])

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

  const filteredMenuItems = menuItems.filter((item) => {
    if (!usuario || !usuario.rol) return false
    return hasRouteAccess(usuario.rol, item.path, preferencias)
  })

  const etiquetaOcultar = sidebarCollapsed ? 'Ocultar menú' : 'Comprimir menú'
  const LogoIcono = marca.LogoIcon || marca.Logo

  return (
    <>
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          bg-oscuro-800 border-r border-oscuro-900
          transition-[transform,width] duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-64'}
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
          shadow-lg lg:shadow-none
        `}
      >
        {/* Header */}
        <div
          className={`relative flex items-center border-b border-oscuro-700 ${
            sidebarCollapsed ? 'justify-center px-1 py-3' : 'justify-center px-12 py-5'
          }`}
        >
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={openSidebar}
              className="w-11 h-11 rounded-lg flex items-center justify-center hover:bg-oscuro-700 transition-colors p-1.5"
              title="Expandir menú"
              aria-label="Expandir menú"
            >
              <LogoIcono className="w-9 h-9 max-h-9" />
            </button>
          ) : (
            <>
              <marca.Logo className="w-40 text-white" />
              <button
                onClick={toggleSidebar}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-oscuro-700 transition-colors"
                aria-label={etiquetaOcultar}
                title={etiquetaOcultar}
              >
                <X className="w-5 h-5 text-gray-300" />
              </button>
            </>
          )}
        </div>

        {/* Navegación */}
        <nav className={`flex-1 overflow-y-auto space-y-1 ${sidebarCollapsed ? 'px-1.5 py-2' : 'p-4'}`}>
          {filteredMenuItems.length === 0 ? (
            <div className="text-gray-400 text-sm text-center py-4">
              {!sidebarCollapsed && 'No hay opciones disponibles'}
            </div>
          ) : (
            filteredMenuItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  onPointerDown={() => precargarVista(item.path)}
                  onPointerEnter={() => precargarVista(item.path)}
                  onFocus={() => precargarVista(item.path)}
                  className={({ isActive }) =>
                    `flex rounded-lg transition-colors duration-200 ${
                      sidebarCollapsed
                        ? 'flex-col items-center justify-center gap-0.5 px-1 py-1.5'
                        : 'flex-row items-center gap-3 px-4 py-3'
                    } ${
                      isActive
                        ? 'bg-marca-500 text-white font-medium'
                        : 'text-gray-300 hover:bg-oscuro-700 hover:text-white'
                    }`
                  }
                  onClick={() => {
                    if (isMobile) toggleSidebar()
                  }}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarCollapsed ? (
                    <span className="text-[9px] leading-tight text-center max-w-full truncate opacity-90">
                      {item.corto || item.label}
                    </span>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              )
            })
          )}
        </nav>

        {/* Footer */}
        <div
          className={`border-t-2 border-gray-500/40 pb-2 ${
            sidebarCollapsed ? 'px-1.5 pt-2' : 'px-4 pt-3'
          }`}
        >
          <div className={`flex items-center mb-2 ${sidebarCollapsed ? 'flex-col gap-1' : 'gap-1'}`}>
            <PrinterConnectionButton printer={printer} iconOnly className="hover:bg-oscuro-700" />

            {!sidebarCollapsed && <NotificationsBell variant="sidebar" />}

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

            {sidebarCollapsed && (
              <button
                onClick={openSidebar}
                className={ICONO_SIDEBAR}
                title="Expandir menú"
                aria-label="Expandir menú"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleSidebar}
              className={ICONO_SIDEBAR}
              title={etiquetaOcultar}
              aria-label={etiquetaOcultar}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <>
              <div className="relative" ref={refPerfil}>
                <button
                  type="button"
                  onClick={() => setMenuPerfilAbierto((v) => !v)}
                  title="Cuenta"
                  aria-label="Cuenta"
                  aria-expanded={menuPerfilAbierto}
                  className={`w-full min-w-0 flex items-center gap-2 rounded-lg p-1.5 -ml-1.5 transition-colors hover:bg-oscuro-700 ${
                    menuPerfilAbierto ? 'bg-oscuro-700' : ''
                  }`}
                >
                  <div className="w-9 h-9 shrink-0 bg-marca-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{getInitials()}</span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-white truncate">{getFullName()}</div>
                    <div className="text-xs text-gray-400 truncate">Cuenta</div>
                  </div>
                </button>

                {menuPerfilAbierto && (
                  <div className="absolute z-50 left-0 right-0 bottom-full mb-2 rounded-lg border border-oscuro-600 bg-oscuro-800 shadow-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={irAPerfil}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-gray-200 hover:bg-oscuro-700 text-left"
                    >
                      <UserRound className="w-4 h-4 shrink-0" />
                      Mi perfil
                    </button>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-300 hover:bg-red-500/15 text-left border-t border-oscuro-700"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-500 text-center mt-1.5">
                v6.2.5 · Desarrollado por Prothec
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar
