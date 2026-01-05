import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { hasRouteAccess, getAllowedRoutes } from '../utils/rolePermissions'

/**
 * Componente que protege rutas basándose en el rol del usuario
 * Si el usuario no tiene el rol necesario, lo redirige a una ruta permitida
 * NOTA: Este componente asume que ya estamos dentro de ProtectedRoute,
 * por lo que no verifica autenticación, solo permisos por rol
 */
const RoleProtectedRoute = ({ children, requiredRoles }) => {
  const { usuario } = useAuth()
  const location = useLocation()

  // Si no hay usuario, no debería llegar aquí (ProtectedRoute ya lo maneja)
  // Pero por seguridad, redirigir al login
  if (!usuario || !usuario.rol) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Verificar si el usuario tiene acceso a esta ruta
  const userRol = usuario.rol
  const currentPath = location.pathname

  // Función para obtener la primera ruta permitida para el usuario
  const getFirstAllowedRoute = (rol) => {
    const allowedRoutes = getAllowedRoutes(rol)
    // Priorizar ciertas rutas según el rol
    if (rol?.toLowerCase() === 'vendedor') {
      return allowedRoutes.find(route => route === '/punto-venta') || allowedRoutes[0] || '/punto-venta'
    } else if (rol?.toLowerCase() === 'cocina') {
      return allowedRoutes.find(route => route === '/barista') || allowedRoutes[0] || '/barista'
    } else {
      return allowedRoutes.find(route => route === '/dashboard') || allowedRoutes[0] || '/dashboard'
    }
  }

  // Si se especificaron roles requeridos, verificar contra ellos
  if (requiredRoles && Array.isArray(requiredRoles)) {
    const hasAccess = requiredRoles.some(rol => 
      hasRouteAccess(userRol, currentPath) || rol.toLowerCase() === userRol?.toLowerCase()
    )
    
    if (!hasAccess) {
      // Redirigir a la primera ruta permitida para este rol
      const firstAllowed = getFirstAllowedRoute(userRol)
      return <Navigate to={firstAllowed} replace />
    }
  } else {
    // Verificar acceso usando la configuración de permisos
    if (!hasRouteAccess(userRol, currentPath)) {
      // Redirigir a la primera ruta permitida para este rol
      const firstAllowed = getFirstAllowedRoute(userRol)
      return <Navigate to={firstAllowed} replace />
    }
  }

  // Si tiene acceso, renderizar el componente hijo
  return children
}

export default RoleProtectedRoute

