import { useState, useEffect } from 'react'
import { Save, Bell, CreditCard, Store, Users, Package, DollarSign, ShoppingCart, Loader2 } from 'lucide-react'
import { useUsuarios } from '../hooks/useUsuarios'
import { useVentas } from '../hooks/useVentas'
import { useProductos } from '../hooks/useProductos'
import { useClientes } from '../hooks/useClientes'
import { useComandas } from '../hooks/useComandas'

const Configuracion = () => {
  const { usuarios, loading: usuariosLoading } = useUsuarios()
  const { obtenerVentas } = useVentas()
  const { productos } = useProductos()
  const { clientes } = useClientes()
  const { obtenerComandas } = useComandas()
  
  const [metodosPagoUsados, setMetodosPagoUsados] = useState([])
  const [estadisticas, setEstadisticas] = useState({
    totalVentas: 0,
    totalComandas: 0,
    productosActivos: 0,
    productosInactivos: 0,
    clientesTotal: 0,
    usuariosActivos: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true)
        
        // Obtener ventas recientes para métodos de pago
        const hoy = new Date()
        const hace30Dias = new Date()
        hace30Dias.setDate(hace30Dias.getDate() - 30)
        
        const ventasRecientes = await obtenerVentas(
          hace30Dias.toISOString().split('T')[0],
          hoy.toISOString().split('T')[0]
        ).catch(() => [])
        
        // Obtener métodos de pago únicos usados
        if (Array.isArray(ventasRecientes)) {
          const metodosUnicos = [...new Set(ventasRecientes.map(v => v.metodo_pago).filter(Boolean))]
          setMetodosPagoUsados(metodosUnicos)
        }
        
        // Obtener todas las comandas para contar (sin filtro de estado)
        let todasComandas = []
        try {
          const comandasPendientes = await obtenerComandas('pendiente').catch(() => [])
          const comandasEnPreparacion = await obtenerComandas('en_preparacion').catch(() => [])
          const comandasTerminadas = await obtenerComandas('terminada').catch(() => [])
          const comandasCanceladas = await obtenerComandas('cancelada').catch(() => [])
          todasComandas = [
            ...(Array.isArray(comandasPendientes) ? comandasPendientes : []),
            ...(Array.isArray(comandasEnPreparacion) ? comandasEnPreparacion : []),
            ...(Array.isArray(comandasTerminadas) ? comandasTerminadas : []),
            ...(Array.isArray(comandasCanceladas) ? comandasCanceladas : [])
          ]
        } catch (error) {
          console.error('Error al obtener comandas:', error)
          todasComandas = []
        }
        
        // Calcular estadísticas
        const productosActivos = productos.filter(p => p.activo === 1 || p.activo === true).length
        const productosInactivos = productos.filter(p => p.activo === 0 || p.activo === false).length
        const usuariosActivos = usuarios.filter(u => u.activo === 1 || u.activo === true).length
        
        const totalVentas = Array.isArray(ventasRecientes) 
          ? ventasRecientes.reduce((sum, v) => sum + parseFloat(v.total || 0), 0)
          : 0
        
        setEstadisticas({
          totalVentas,
          totalComandas: Array.isArray(todasComandas) ? todasComandas.length : 0,
          productosActivos,
          productosInactivos,
          clientesTotal: clientes.length,
          usuariosActivos
        })
      } catch (error) {
        console.error('Error al cargar datos de configuración:', error)
      } finally {
        setLoading(false)
      }
    }
    
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, usuarios, clientes])

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cocina: 'Cocina',
      administrador: 'Administrador',
      superadministrador: 'Super Administrador',
    }
    return labels[rol] || rol
  }

  const getMetodoPagoLabel = (metodo) => {
    const labels = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta de Débito/Crédito',
      transferencia: 'Transferencia Bancaria',
      'pago-movil': 'Pago Móvil',
    }
    return labels[metodo] || metodo
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-600 mt-1">Información y estadísticas del sistema</p>
      </div>

      {/* Información de la Cafetería */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Información de la Cafetería
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Cafetería
            </label>
            <input
              type="text"
              defaultValue="Zona 2 Coffee Recovery"
              className="input"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input type="text" className="input" disabled />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input type="tel" className="input" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input type="email" className="input" disabled />
            </div>
          </div>
          <p className="text-xs text-gray-500 italic">
            * La configuración de la cafetería se puede gestionar desde la base de datos
          </p>
        </div>
      </div>

      {/* Configuración de Pagos */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Métodos de Pago Usados (Últimos 30 días)
          </h2>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-matcha-600" />
            </div>
          ) : metodosPagoUsados.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No hay métodos de pago registrados</p>
          ) : (
            metodosPagoUsados.map((metodo) => (
              <div
                key={metodo}
                className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50"
              >
                <div className="w-4 h-4 rounded-full bg-green-500"></div>
                <span className="text-gray-900 font-medium">{getMetodoPagoLabel(metodo)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Notificaciones */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">Notificaciones</h2>
        </div>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Stock Bajo</p>
              <p className="text-sm text-gray-500">
                Recibir alertas cuando el stock esté bajo
              </p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Nuevos Pedidos</p>
              <p className="text-sm text-gray-500">
                Notificaciones cuando llegue un nuevo pedido
              </p>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4" />
          </label>
          <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div>
              <p className="text-gray-900 font-medium">Reportes Diarios</p>
              <p className="text-sm text-gray-500">
                Envío automático de reportes al final del día
              </p>
            </div>
            <input type="checkbox" className="w-4 h-4" />
          </label>
        </div>
      </div>

      {/* Usuarios */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-matcha-600" />
            <h2 className="text-lg font-semibold text-gray-900">Usuarios del Sistema</h2>
          </div>
          <span className="px-3 py-1 bg-matcha-100 text-matcha-700 text-sm font-medium rounded">
            {estadisticas.usuariosActivos} activos
          </span>
        </div>
        <div className="space-y-3">
          {usuariosLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No hay usuarios registrados</p>
          ) : (
            usuarios.slice(0, 10).map((user) => {
              const nombreCompleto = user.nombre_completo || 
                `${user.nombre || ''} ${user.apellido_paterno || ''} ${user.apellido_materno || ''}`.trim()
              return (
                <div
                  key={user.id_usuario}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    user.activo === 1 || user.activo === true
                      ? 'border-gray-200 bg-white'
                      : 'border-gray-300 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{nombreCompleto || 'Sin nombre'}</p>
                    <p className="text-sm text-gray-500">{user.correo || 'Sin correo'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      user.rol === 'vendedor' ? 'bg-green-100 text-green-700' :
                      user.rol === 'cocina' ? 'bg-orange-100 text-orange-700' :
                      user.rol === 'administrador' ? 'bg-purple-100 text-purple-700' :
                      user.rol === 'superadministrador' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getRolLabel(user.rol)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      user.activo === 1 || user.activo === true
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.activo === 1 || user.activo === true ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          {usuarios.length > 10 && (
            <p className="text-xs text-gray-500 text-center pt-2">
              Mostrando 10 de {usuarios.length} usuarios. Ver todos en la sección de Empleados.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Configuracion




