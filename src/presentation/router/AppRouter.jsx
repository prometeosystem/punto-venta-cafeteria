import { Routes, Route, Navigate } from 'react-router-dom'
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
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="punto-venta" element={<PuntoVenta />} />
        <Route path="barista" element={<Barista />} />
        <Route path="productos" element={<Productos />} />
        <Route path="inventario" element={<Inventario />} />
        {/* <Route path="clientes" element={<Clientes />} /> */} {/* Temporalmente oculto */}
        <Route path="loyabit" element={<Loyabit />} />
        <Route path="empleados" element={<Empleados />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

export default AppRouter


