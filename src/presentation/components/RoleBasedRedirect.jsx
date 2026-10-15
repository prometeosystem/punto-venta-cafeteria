import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import { getAllowedRoutes, rutaInicial } from '../utils/rolePermissions'
import { Loader2 } from 'lucide-react'

/**
 * Componente que redirige al usuario a su primera ruta permitida según su rol
 */
const RoleBasedRedirect = () => {
  const { usuario, loading, isAuthenticated } = useAuth()
  const { preferencias, cargando: cargandoPrefs } = usePreferencias()

  if (loading || cargandoPrefs) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
      </div>
    )
  }

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />
  }

  if (!usuario.rol) {
    console.warn('Usuario autenticado pero sin rol asignado')
    return <Navigate to="/login" replace />
  }

  const rol = usuario.rol
  const allowedRoutes = getAllowedRoutes(rol, preferencias)

  if (!allowedRoutes || allowedRoutes.length === 0) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={rutaInicial(rol, preferencias)} replace />
}

export default RoleBasedRedirect
