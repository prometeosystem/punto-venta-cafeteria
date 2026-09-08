import { Outlet, useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import ToastNotification from '../components/ToastNotification'
import { useLayout } from '../context/LayoutContext'
import { useNotifications } from '../context/NotificationContext'

const MainLayout = () => {
  const { sidebarOpen, toggleSidebar, headerVisible } = useLayout()
  const { pathname } = useLocation()
  const { toastNotifications, removeToastNotification, removeNotification } = useNotifications()
  const isPuntoVenta = pathname.includes('punto-venta')

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
      
      <div className="min-h-screen bg-gray-50 flex overflow-hidden h-dvh max-h-dvh">
        <Sidebar />
        <div 
          className={`flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-0'
          }`}
        >
          {headerVisible && <Header />}

          <main
            className={`flex-1 min-h-0 flex flex-col ${
              isPuntoVenta ? 'overflow-hidden p-0' : 'overflow-y-auto p-3 lg:p-4'
            }`}
          >
            <Outlet />
          </main>
        </div>
      </div>

      {/* Sin barra superior el menú se abre desde aquí; el sidebar trae el resto de controles */}
      {!headerVisible && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-4 left-4 z-40 p-3 rounded-full bg-coffee-800/90 text-white shadow-lg hover:bg-coffee-700 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}
    </>
  )
}

export default MainLayout







