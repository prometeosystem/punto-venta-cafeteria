import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import { LayoutProvider } from './context/LayoutContext'
import { AuthProvider } from './context/AuthContext'

function App() {
  return (
    <BrowserRouter basename="/sistema">
      <AuthProvider>
        <LayoutProvider>
          <AppRouter />
        </LayoutProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App




