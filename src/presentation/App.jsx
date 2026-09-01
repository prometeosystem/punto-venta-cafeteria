import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import { LayoutProvider } from './context/LayoutContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

const routerBasename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/'

function App() {
  return (
    <BrowserRouter
      basename={routerBasename === '/' ? undefined : routerBasename}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <LayoutProvider>
          <NotificationProvider>
            <AppRouter />
          </NotificationProvider>
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App




