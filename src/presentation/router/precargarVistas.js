import { lazy } from 'react'

const cargadores = {
  '/dashboard': () => import('../pages/Dashboard'),
  '/punto-venta': () => import('../pages/PuntoVenta'),
  '/mesas': () => import('../pages/Mesas'),
  '/barista': () => import('../pages/Barista'),
  '/productos': () => import('../pages/Productos'),
  '/productos/nuevo': () => import('../pages/ProductoFormulario'),
  '/inventario': () => import('../pages/Inventario'),
  '/proveedores': () => import('../pages/Proveedores'),
  '/devoluciones': () => import('../pages/Devoluciones'),
  '/empleados': () => import('../pages/Empleados'),
  '/caja': () => import('../pages/Caja'),
  '/historial-caja': () => import('../pages/HistorialCaja'),
  '/movimientos-caja': () => import('../pages/MovimientosCaja'),
  '/categorias-movimiento': () => import('../pages/CategoriasMovimiento'),
  '/contabilidad': () => import('../pages/Contabilidad'),
  '/reportes': () => import('../pages/Reportes'),
  '/bitacora': () => import('../pages/Bitacora'),
  '/configuracion': () => import('../pages/Configuracion'),
  '/test-sonidos': () => import('../pages/TestNotificationSounds'),
  '/mi-perfil': () => import('../pages/MiPerfil'),
}

function importarConReintento(cargar, quedan = 2) {
  return cargar().catch((error) => {
    if (quedan <= 0) throw error
    return new Promise((resolver) => {
      setTimeout(resolver, 400)
    }).then(() => importarConReintento(cargar, quedan - 1))
  })
}

export function precargarVista(path) {
  const cargar = cargadores[path]
  if (!cargar) return
  cargar().catch(() => {})
}

export function vistaPerezosa(path) {
  return lazy(() => importarConReintento(cargadores[path]))
}

export function precargarMenuEnSegundoPlano(rutas) {
  const pendientes = rutas.filter((ruta) => cargadores[ruta])
  const lanzar = (indice) => {
    if (indice >= pendientes.length) return
    precargarVista(pendientes[indice])
    window.setTimeout(() => lanzar(indice + 1), 350)
  }
  const empezar = () => lanzar(0)
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(empezar, { timeout: 2000 })
  } else {
    window.setTimeout(empezar, 1200)
  }
}
