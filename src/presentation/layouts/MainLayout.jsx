import { Component, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'
import CambiarCodigoObligatorio from '../components/CambiarCodigoObligatorio'
import ElegirModoAlEntrar from '../components/ElegirModoAlEntrar'
import { useLayout } from '../context/LayoutContext'
import { useNotifications } from '../context/NotificationContext'
import { precargarMenuEnSegundoPlano } from '../router/precargarVistas'

const esFalloDeCarga = (error) =>
  /dynamically imported module|loading chunk|failed to fetch|importing a module script failed/i.test(
    String(error?.message || error || '')
  )

class LimiteErrorVista extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    if (!esFalloDeCarga(error)) return
    if (sessionStorage.getItem('recarga-vista')) return
    sessionStorage.setItem('recarga-vista', '1')
    window.location.reload()
  }

  componentDidUpdate(prev) {
    if (prev.clave !== this.props.clave && this.state.error) {
      this.setState({ error: null })
    }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 min-h-[40vh] text-center px-4">
        <p className="text-sm text-gray-600">No se pudo mostrar esta vista.</p>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Recargar
        </button>
      </div>
    )
  }
}

const MainLayout = () => {
  const { sidebarOpen, sidebarCollapsed, openSidebar, headerVisible } = useLayout()
  const { pathname } = useLocation()
  const { toastNotifications, removeToastNotification, removeNotification } = useNotifications()
  const isPuntoVenta = pathname.includes('punto-venta')

  const margenSidebar = !sidebarOpen
    ? 'lg:ml-0'
    : sidebarCollapsed
      ? 'lg:ml-20'
      : 'lg:ml-64'

  useEffect(() => {
    const ajustar = () => {
      const vista = window.visualViewport
      const alto = vista?.height || window.innerHeight
      const arriba = vista?.offsetTop || 0
      const html = document.documentElement
      if (!alto || alto < 200) {
        html.style.removeProperty('--alto-visible')
        html.style.removeProperty('--arriba-visible')
        return
      }
      html.style.setProperty('--alto-visible', `${alto}px`)
      html.style.setProperty('--arriba-visible', `${arriba}px`)
    }
    const html = document.documentElement
    const previoHtml = html.style.overflow
    const previoBody = document.body.style.overflow
    html.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    ajustar()
    const vista = window.visualViewport
    vista?.addEventListener('resize', ajustar)
    vista?.addEventListener('scroll', ajustar)
    window.addEventListener('resize', ajustar)
    const limpiarRecarga = window.setTimeout(() => sessionStorage.removeItem('recarga-vista'), 8000)
    precargarMenuEnSegundoPlano([
      '/dashboard',
      '/punto-venta',
      '/productos',
      '/inventario',
      '/reportes',
      '/caja',
      '/empleados',
      '/proveedores',
      '/contabilidad',
      '/bitacora',
      '/configuracion',
      '/mesas',
      '/barista',
      '/devoluciones',
      '/movimientos-caja',
    ])
    return () => {
      window.clearTimeout(limpiarRecarga)
      html.style.overflow = previoHtml
      document.body.style.overflow = previoBody
      vista?.removeEventListener('resize', ajustar)
      vista?.removeEventListener('scroll', ajustar)
      window.removeEventListener('resize', ajustar)
    }
  }, [])

  const handleNavigate = (notificationId) => {
    // Eliminar de notificaciones permanentes cuando se toca el toast
    removeNotification(notificationId)
  }
  
  return (
    <>
      <style>{`
        @keyframes slideInFromRight {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .toast-notification-wrapper {
          animation: slideInFromRight 0.3s ease-out;
        }
      `}</style>
      
      {/* Notificaciones Toast en la parte superior derecha - Fuera del layout para que esté siempre visible */}
      {toastNotifications.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] w-full max-w-md pointer-events-none">
          <div className="flex flex-col gap-2">
            {toastNotifications.map((notification, index) => (
              <div
                key={notification.id}
                className="pointer-events-auto toast-notification-wrapper"
              >
                <ToastNotification
                  notification={notification}
                  onClose={() => removeToastNotification(notification.id)}
                  onNavigate={handleNavigate}
                  duration={5000}
                  isActive={index === 0}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="fixed left-0 right-0 z-0 flex w-full overflow-hidden bg-gray-50 top-[var(--arriba-visible,0px)] h-[var(--alto-visible,100dvh)] max-h-[var(--alto-visible,100dvh)]">
        <Sidebar />
        <div
          className={`flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300 ease-in-out ${margenSidebar}`}
        >
          {headerVisible && <Header />}

          <main
            className={`flex-1 min-h-0 flex flex-col ${
              isPuntoVenta ? 'overflow-hidden p-0' : 'overflow-y-auto p-3 lg:p-4'
            }`}
          >
            <LimiteErrorVista clave={pathname}>
              <Outlet />
            </LimiteErrorVista>
          </main>
        </div>

        {!sidebarOpen && (
          <button
            onClick={openSidebar}
            className={`absolute right-4 z-[60] p-3 rounded-full bg-oscuro-800/90 text-white shadow-lg hover:bg-oscuro-700 transition-colors ${
              headerVisible ? 'lg:hidden' : 'lg:left-4 lg:right-auto'
            } ${isPuntoVenta ? 'bottom-24 landscape:bottom-4' : 'bottom-4'}`}
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      <CambiarCodigoObligatorio />
      <ElegirModoAlEntrar />
    </>
  )
}

export default MainLayout







