import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Dashboard from '../pages/Dashboard'
import PuntoVenta from '../pages/PuntoVenta'
import Productos from '../pages/Productos'
import Inventario from '../pages/Inventario'
import Clientes from '../pages/Clientes'
import Pedidos from '../pages/Pedidos'
import Reportes from '../pages/Reportes'
import Configuracion from '../pages/Configuracion'

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="punto-venta" element={<PuntoVenta />} />
        <Route path="productos" element={<Productos />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
    </Routes>
  )
}

export default AppRouter

