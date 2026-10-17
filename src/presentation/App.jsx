import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import { LayoutProvider } from './context/LayoutContext'
import { AuthProvider } from './context/AuthContext'
import { PreferenciasProvider } from './context/PreferenciasContext'
import { NotificationProvider } from './context/NotificationContext'
import { PrinterProvider } from './context/PrinterContext'

const routerBasename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'

function App() {
  return (
    <BrowserRouter
      basename={routerBasename === '/' ? undefined : routerBasename}
      future={{
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <PreferenciasProvider>
          <LayoutProvider>
            <NotificationProvider>
              <PrinterProvider>
                <AppRouter />
              </PrinterProvider>
            </NotificationProvider>
          </LayoutProvider>
        </PreferenciasProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App




