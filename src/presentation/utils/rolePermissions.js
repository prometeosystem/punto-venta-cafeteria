/**
 * Configuración de permisos por rol
 * Define qué rutas puede acceder cada rol
 */

// Definir permisos por ruta
// Vendedor: Punto de Ventas y Comandas
// Cocina: solo Comandas
// Mesero: solo Punto de Ventas y Comandas (sin cobrar, ver puedeCobrar en PuntoVenta)
// Administrador: todas las pantallas
// Super Administrador: todas las pantallas
const routePermissions = {
  // El dashboard son gráficas de ventas: es información de negocio, igual que
  // los reportes, y el backend ya restringe esos endpoints a admin.
  '/dashboard': ['administrador', 'superadministrador'],
  '/punto-venta': ['vendedor', 'mesero', 'administrador', 'superadministrador'],
  '/mesas': ['vendedor', 'mesero', 'administrador', 'superadministrador'],
  '/barista': ['vendedor', 'cocina', 'mesero', 'administrador', 'superadministrador'],
  '/productos': ['administrador', 'superadministrador'],
  '/inventario': ['administrador', 'superadministrador'],
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
  '/mi-perfil': ['vendedor', 'cocina', 'mesero', 'administrador', 'superadministrador'],
}

import { RUTAS_SOLO_RESTAURANTE, esModoTienda } from './preferenciasUi'

/**
 * Verifica si un rol tiene acceso a una ruta específica
 * @param {string} rol - El rol del usuario
 * @param {string} route - La ruta a verificar
 * @param {object} [preferencias] - Preferencias UI (oculta mesas/comandas en modo tienda)
 * @returns {boolean} - true si tiene acceso, false si no
 */
export const hasRouteAccess = (rol, route, preferencias) => {
  if (!rol) return false

  const normalizedRol = rol.toLowerCase()
  const allowedRoles = routePermissions[route] || []
  if (!allowedRoles.some((allowedRol) => allowedRol.toLowerCase() === normalizedRol)) {
    return false
  }
  if (esModoTienda(preferencias) && RUTAS_SOLO_RESTAURANTE.includes(route)) {
    return false
  }
  return true
}

/**
 * Obtiene todas las rutas permitidas para un rol específico
 * @param {string} rol - El rol del usuario
 * @param {object} [preferencias]
 * @returns {string[]} - Array de rutas permitidas
 */
export const getAllowedRoutes = (rol, preferencias) => {
  if (!rol) return []

  const normalizedRol = rol.toLowerCase()
  const allowedRoutes = []

  Object.keys(routePermissions).forEach((route) => {
    if (hasRouteAccess(normalizedRol, route, preferencias)) {
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

/**
 * Pantalla con la que abre cada rol al entrar o al caer en una ruta sin permiso.
 * El mesero trabaja desde el plano de mesas (si el negocio es restaurante).
 * @param {string} rol - El rol del usuario
 * @param {object} [preferencias]
 * @returns {string}
 */
export const rutaInicial = (rol, preferencias) => {
  const allowedRoutes = getAllowedRoutes(rol, preferencias)
  const preferida = {
    mesero: esModoTienda(preferencias) ? '/punto-venta' : '/mesas',
    vendedor: '/punto-venta',
    cocina: esModoTienda(preferencias) ? '/punto-venta' : '/barista',
  }[rol?.toLowerCase()] || '/dashboard'
  return allowedRoutes.includes(preferida) ? preferida : allowedRoutes[0] || '/login'
}

export default {
  hasRouteAccess,
  getAllowedRoutes,
  isAdmin,
  puedeCobrar,
  rutaInicial,
  routePermissions,
}

