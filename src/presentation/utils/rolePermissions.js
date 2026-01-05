/**
 * Configuración de permisos por rol
 * Define qué rutas puede acceder cada rol
 */

// Definir permisos por ruta
// Vendedor: Punto de Ventas, Barista (Comandas) y Loyabit
// Barista (cocina): solo Barista e Inventario
// Administrador: todas las pantallas
// Super Administrador: todas las pantallas
const routePermissions = {
  '/dashboard': ['vendedor', 'cocina', 'administrador', 'superadministrador'],
  '/punto-venta': ['vendedor', 'administrador', 'superadministrador'],
  '/barista': ['vendedor', 'cocina', 'administrador', 'superadministrador'],
  '/productos': ['administrador', 'superadministrador'],
  '/inventario': ['cocina', 'administrador', 'superadministrador'],
  '/loyabit': ['vendedor', 'administrador', 'superadministrador'],
  '/empleados': ['administrador', 'superadministrador'],
  '/reportes': ['administrador', 'superadministrador'],
  '/configuracion': ['administrador', 'superadministrador'],
}

/**
 * Verifica si un rol tiene acceso a una ruta específica
 * @param {string} rol - El rol del usuario
 * @param {string} route - La ruta a verificar
 * @returns {boolean} - true si tiene acceso, false si no
 */
export const hasRouteAccess = (rol, route) => {
  if (!rol) return false
  
  // Normalizar el rol a minúsculas
  const normalizedRol = rol.toLowerCase()
  
  // Obtener los roles permitidos para esta ruta
  const allowedRoles = routePermissions[route] || []
  
  // Verificar si el rol está en la lista de permitidos
  return allowedRoles.some(allowedRol => allowedRol.toLowerCase() === normalizedRol)
}

/**
 * Obtiene todas las rutas permitidas para un rol específico
 * @param {string} rol - El rol del usuario
 * @returns {string[]} - Array de rutas permitidas
 */
export const getAllowedRoutes = (rol) => {
  if (!rol) return []
  
  const normalizedRol = rol.toLowerCase()
  const allowedRoutes = []
  
  // Iterar sobre todas las rutas y verificar permisos
  Object.keys(routePermissions).forEach(route => {
    if (hasRouteAccess(normalizedRol, route)) {
      allowedRoutes.push(route)
    }
  })
  
  return allowedRoutes
}

/**
 * Verifica si un rol es administrador o superadministrador
 * @param {string} rol - El rol del usuario
 * @returns {boolean} - true si es admin o superadmin
 */
export const isAdmin = (rol) => {
  if (!rol) return false
  const normalizedRol = rol.toLowerCase()
  return normalizedRol === 'administrador' || normalizedRol === 'superadministrador'
}

export default {
  hasRouteAccess,
  getAllowedRoutes,
  isAdmin,
  routePermissions,
}

