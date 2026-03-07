import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, Package, X, LogOut, AlertTriangle, DollarSign } from 'lucide-react'
import { useLayout } from '../context/LayoutContext'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useNavigate } from 'react-router-dom'

const Header = () => {
  const { sidebarOpen, toggleSidebar } = useLayout()
  const { usuario, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications()
  const navigate = useNavigate()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationRef = useRef(null)
  const userDropdownRef = useRef(null)

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

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Manejar click en notificación
  const handleNotificationClick = (notification) => {
    // Eliminar la notificación al hacer click
    removeNotification(notification.id)
    
    if (notification.accion) {
      if (notification.accion.tipo === 'navegar') {
        // Si hay parámetros de búsqueda, agregarlos a la URL como query params
        if (notification.accion.params?.search) {
          navigate(`${notification.accion.ruta}?search=${encodeURIComponent(notification.accion.params.search)}`)
        } else {
          navigate(notification.accion.ruta, { state: notification.accion.params })
        }
        setShowNotifications(false)
      }
    }
  }

  // Formatear fecha de notificación
  const formatNotificationDate = (fecha) => {
    if (!fecha) return ''
    const date = new Date(fecha)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Hace unos segundos'
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`
    
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Botón menú y nombre (visible solo cuando el sidebar está cerrado) */}
        {!sidebarOpen && (
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Abrir menú"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-xl font-semibold text-coffee-800">
              Zona 2
            </span>
          </div>
        )}

        {/* Acciones del usuario */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Notificaciones */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
              aria-label="Notificaciones"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">{unreadCount > 9 ? '9+' : unreadCount}</span>
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
                {/* Header del dropdown */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-matcha-600 hover:text-matcha-700 font-medium"
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* Lista de notificaciones */}
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No hay notificaciones</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full p-3 hover:bg-gray-50 transition-colors text-left ${
                            !notification.leida ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${
                              notification.tipo === 'comanda' ? 'bg-matcha-100' : 
                              notification.tipo === 'inventario' ? (notification.estado === 'critical' ? 'bg-red-100' : 'bg-yellow-100') :
                              notification.tipo === 'preorden' ? 'bg-blue-100' :
                              notification.tipo === 'comanda-lista-cobrar' ? 'bg-amber-100' :
                              'bg-gray-100'
                            }`}>
                              {notification.icono === 'package' ? (
                                <Package className={`w-6 h-6 ${
                                  notification.tipo === 'comanda' ? 'text-matcha-600' : 'text-gray-600'
                                }`} />
                              ) : notification.icono === 'alert-triangle' ? (
                                <AlertTriangle className={`w-6 h-6 ${
                                  notification.tipo === 'inventario' ? 
                                    (notification.estado === 'critical' ? 'text-red-600' : 'text-yellow-600') :
                                    'text-gray-600'
                                }`} />
                              ) : notification.icono === 'dollar-sign' ? (
                                <DollarSign className="w-6 h-6 text-amber-600" />
                              ) : (
                                <Bell className={`w-6 h-6 ${
                                  notification.tipo === 'comanda' ? 'text-matcha-600' : 
                                  notification.tipo === 'preorden' ? 'text-blue-600' :
                                  'text-gray-600'
                                }`} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className={`text-sm font-medium ${
                                  !notification.leida ? 'text-gray-900' : 'text-gray-700'
                                }`}>
                                  {notification.titulo}
                                </p>
                                {!notification.leida && (
                                  <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                                {notification.mensaje}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatNotificationDate(notification.fecha)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                removeNotification(notification.id)
                              }}
                              className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Dropdown de usuario */}
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
            
            {/* Dropdown menu */}
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


