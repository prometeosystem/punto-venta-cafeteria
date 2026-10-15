import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import { hasRouteAccess, rutaInicial } from '../utils/rolePermissions'

/**
 * Protege rutas según el rol y el modo del negocio (tienda oculta mesas/comandas).
 */
const RoleProtectedRoute = ({ children, requiredRoles }) => {
  const { usuario } = useAuth()
  const { preferencias } = usePreferencias()
  const location = useLocation()

  if (!usuario || !usuario.rol) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  const userRol = usuario.rol
  const currentPath = location.pathname

  if (requiredRoles && Array.isArray(requiredRoles)) {
    const hasAccess = requiredRoles.some((rol) =>
      hasRouteAccess(userRol, currentPath, preferencias) || rol.toLowerCase() === userRol?.toLowerCase()
    )

    if (!hasAccess || !hasRouteAccess(userRol, currentPath, preferencias)) {
      return <Navigate to={rutaInicial(userRol, preferencias)} replace />
    }
  } else if (!hasRouteAccess(userRol, currentPath, preferencias)) {
    return <Navigate to={rutaInicial(userRol, preferencias)} replace />
  }

  return children
}

export default RoleProtectedRoute
