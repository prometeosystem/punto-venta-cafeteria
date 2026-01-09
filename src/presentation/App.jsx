import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import { LayoutProvider } from './context/LayoutContext'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'

function App() {
  return (
    <BrowserRouter basename="/sistema">
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




