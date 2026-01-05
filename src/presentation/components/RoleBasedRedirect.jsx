import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getAllowedRoutes } from '../utils/rolePermissions'
import { Loader2 } from 'lucide-react'

/**
 * Componente que redirige al usuario a su primera ruta permitida según su rol
 */
const RoleBasedRedirect = () => {
  const { usuario, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />
  }

  // Si no tiene rol, también redirigir al login
  if (!usuario.rol) {
    console.warn('Usuario autenticado pero sin rol asignado')
    return <Navigate to="/login" replace />
  }

  const rol = usuario.rol
  const allowedRoutes = getAllowedRoutes(rol)

  // Si no hay rutas permitidas, redirigir al login
  if (!allowedRoutes || allowedRoutes.length === 0) {
    return <Navigate to="/login" replace />
  }

  // Priorizar ciertas rutas según el rol
  let defaultRoute = '/dashboard'
  
  if (rol?.toLowerCase() === 'vendedor') {
    defaultRoute = allowedRoutes.find(route => route === '/punto-venta') || allowedRoutes[0] || '/punto-venta'
  } else if (rol?.toLowerCase() === 'cocina') {
    defaultRoute = allowedRoutes.find(route => route === '/barista') || allowedRoutes[0] || '/barista'
  } else {
    defaultRoute = allowedRoutes.find(route => route === '/dashboard') || allowedRoutes[0] || '/dashboard'
  }

  // Asegurarse de que la ruta sea válida
  if (!defaultRoute || !allowedRoutes.includes(defaultRoute)) {
    defaultRoute = allowedRoutes[0] || '/login'
  }

  return <Navigate to={defaultRoute} replace />
}

export default RoleBasedRedirect

