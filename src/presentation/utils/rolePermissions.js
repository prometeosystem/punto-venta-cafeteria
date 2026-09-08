/**
 * Configuración de permisos por rol
 * Define qué rutas puede acceder cada rol
 */

// Definir permisos por ruta
// Vendedor: Punto de Ventas, Comandas y Loyabit
// Cocina: solo Comandas e Inventario
// Mesero: solo Punto de Ventas y Comandas (sin cobrar, ver puedeCobrar en PuntoVenta)
// Administrador: todas las pantallas
// Super Administrador: todas las pantallas
const routePermissions = {
  // El dashboard son gráficas de ventas: es información de negocio, igual que
  // los reportes, y el backend ya restringe esos endpoints a admin.
  '/dashboard': ['administrador', 'superadministrador'],
  '/punto-venta': ['vendedor', 'mesero', 'administrador', 'superadministrador'],
  '/barista': ['vendedor', 'cocina', 'mesero', 'administrador', 'superadministrador'],
  '/productos': ['administrador', 'superadministrador'],
  '/inventario': ['cocina', 'administrador', 'superadministrador'],
  '/loyabit': ['vendedor', 'administrador', 'superadministrador'],
  '/empleados': ['administrador', 'superadministrador'],
  '/reportes': ['administrador', 'superadministrador'],
  '/configuracion': ['administrador', 'superadministrador'],
  '/bitacora': ['administrador', 'superadministrador'],
  '/caja': ['vendedor', 'administrador', 'superadministrador'],
  '/historial-caja': ['administrador', 'superadministrador'],
  '/movimientos-caja': ['vendedor', 'administrador', 'superadministrador'],
  '/categorias-movimiento': ['administrador', 'superadministrador'],
  '/contabilidad': ['administrador', 'superadministrador'],
  '/test-sonidos': ['administrador', 'superadministrador'], // Ruta de prueba para sonidos
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

/**
 * Verifica si un rol puede cobrar (efectivo, tarjeta, procesar venta).
 * El mesero arma órdenes y las manda a comandas, pero el cobro es de caja.
 * El backend lo respalda: procesar_pago no acepta al rol mesero.
 * @param {string} rol - El rol del usuario
 * @returns {boolean}
 */
export const puedeCobrar = (rol) => {
  if (!rol) return false
  return rol.toLowerCase() !== 'mesero'
}

export default {
  hasRouteAccess,
  getAllowedRoutes,
  isAdmin,
  puedeCobrar,
  routePermissions,
}

