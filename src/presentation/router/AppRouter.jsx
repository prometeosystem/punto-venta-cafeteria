import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Login from '../pages/Login'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import RoleBasedRedirect from '../components/RoleBasedRedirect'

const Dashboard = lazy(() => import('../pages/Dashboard'))
const PuntoVenta = lazy(() => import('../pages/PuntoVenta'))
const Productos = lazy(() => import('../pages/Productos'))
const Inventario = lazy(() => import('../pages/Inventario'))
const Empleados = lazy(() => import('../pages/Empleados'))
const Reportes = lazy(() => import('../pages/Reportes'))
const Configuracion = lazy(() => import('../pages/Configuracion'))
const Loyabit = lazy(() => import('../pages/Loyabit'))
const Barista = lazy(() => import('../pages/Barista'))
const Bitacora = lazy(() => import('../pages/Bitacora'))
const Caja = lazy(() => import('../pages/Caja'))
const HistorialCaja = lazy(() => import('../pages/HistorialCaja'))
const MovimientosCaja = lazy(() => import('../pages/MovimientosCaja'))
const CategoriasMovimiento = lazy(() => import('../pages/CategoriasMovimiento'))
const Contabilidad = lazy(() => import('../pages/Contabilidad'))
const TestNotificationSounds = lazy(() => import('../pages/TestNotificationSounds'))

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-matcha-500" />
  </div>
)

const LazyPage = ({ children }) => (
  <Suspense fallback={<PageLoader />}>{children}</Suspense>
)

function AppRouter() {
  return (
    <Routes>
      {/* Ruta pública de login */}
      <Route path="/login" element={<Login />} />
      
      {/* Rutas protegidas */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<RoleProtectedRoute><LazyPage><Dashboard /></LazyPage></RoleProtectedRoute>} />
        <Route path="punto-venta" element={<RoleProtectedRoute><LazyPage><PuntoVenta /></LazyPage></RoleProtectedRoute>} />
        <Route path="barista" element={<RoleProtectedRoute><LazyPage><Barista /></LazyPage></RoleProtectedRoute>} />
        <Route path="productos" element={<RoleProtectedRoute><LazyPage><Productos /></LazyPage></RoleProtectedRoute>} />
        <Route path="inventario" element={<RoleProtectedRoute><LazyPage><Inventario /></LazyPage></RoleProtectedRoute>} />
        <Route path="loyabit" element={<RoleProtectedRoute><LazyPage><Loyabit /></LazyPage></RoleProtectedRoute>} />
        <Route path="empleados" element={<RoleProtectedRoute><LazyPage><Empleados /></LazyPage></RoleProtectedRoute>} />
        <Route path="reportes" element={<RoleProtectedRoute><LazyPage><Reportes /></LazyPage></RoleProtectedRoute>} />
        <Route path="bitacora" element={<RoleProtectedRoute><LazyPage><Bitacora /></LazyPage></RoleProtectedRoute>} />
        <Route path="caja" element={<RoleProtectedRoute><LazyPage><Caja /></LazyPage></RoleProtectedRoute>} />
        <Route path="historial-caja" element={<RoleProtectedRoute><LazyPage><HistorialCaja /></LazyPage></RoleProtectedRoute>} />
        <Route path="movimientos-caja" element={<RoleProtectedRoute><LazyPage><MovimientosCaja /></LazyPage></RoleProtectedRoute>} />
        <Route path="categorias-movimiento" element={<RoleProtectedRoute><LazyPage><CategoriasMovimiento /></LazyPage></RoleProtectedRoute>} />
        <Route path="contabilidad" element={<RoleProtectedRoute><LazyPage><Contabilidad /></LazyPage></RoleProtectedRoute>} />
        <Route path="configuracion" element={<RoleProtectedRoute><LazyPage><Configuracion /></LazyPage></RoleProtectedRoute>} />
        <Route path="test-sonidos" element={<RoleProtectedRoute><LazyPage><TestNotificationSounds /></LazyPage></RoleProtectedRoute>} />
      </Route>
    </Routes>
  )
}

export default AppRouter


