import { BrowserRouter } from 'react-router-dom'
import AppRouter from './router/AppRouter'
import { LayoutProvider } from './context/LayoutContext'

function App() {
  return (
    <BrowserRouter>
      <LayoutProvider>
        <AppRouter />
      </LayoutProvider>
    </BrowserRouter>
  )
}

export default App

