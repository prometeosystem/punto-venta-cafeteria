import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Login from '../pages/Login'
import Dashboard from '../pages/Dashboard'
import PuntoVenta from '../pages/PuntoVenta'
import Productos from '../pages/Productos'
import Inventario from '../pages/Inventario'
// import Clientes from '../pages/Clientes' // Temporalmente oculto
import Empleados from '../pages/Empleados'
import Reportes from '../pages/Reportes'
import Configuracion from '../pages/Configuracion'
import Loyabit from '../pages/Loyabit'
import Barista from '../pages/Barista'
import ProtectedRoute from '../components/ProtectedRoute'
import RoleProtectedRoute from '../components/RoleProtectedRoute'
import RoleBasedRedirect from '../components/RoleBasedRedirect'

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
        <Route 
          path="dashboard" 
          element={
            <RoleProtectedRoute>
              <Dashboard />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="punto-venta" 
          element={
            <RoleProtectedRoute>
              <PuntoVenta />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="barista" 
          element={
            <RoleProtectedRoute>
              <Barista />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="productos" 
          element={
            <RoleProtectedRoute>
              <Productos />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="inventario" 
          element={
            <RoleProtectedRoute>
              <Inventario />
            </RoleProtectedRoute>
          } 
        />
        {/* <Route path="clientes" element={<Clientes />} /> */} {/* Temporalmente oculto */}
        <Route 
          path="loyabit" 
          element={
            <RoleProtectedRoute>
              <Loyabit />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="empleados" 
          element={
            <RoleProtectedRoute>
              <Empleados />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="reportes" 
          element={
            <RoleProtectedRoute>
              <Reportes />
            </RoleProtectedRoute>
          } 
        />
        <Route 
          path="configuracion" 
          element={
            <RoleProtectedRoute>
              <Configuracion />
            </RoleProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  )
}

export default AppRouter


