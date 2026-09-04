import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CreditCard, Store, Users, Loader2, Tags, ChevronRight } from 'lucide-react'
import { useUsuarios } from '../hooks/useUsuarios'
import { useVentas } from '../hooks/useVentas'
import { useProductos } from '../hooks/useProductos'
import { useClientes } from '../hooks/useClientes'
import { useComandas } from '../hooks/useComandas'
import {
  METODOS_PAGO_DISPONIBLES,
  obtenerMetodosPagoConfig,
  guardarMetodosPagoConfig,
} from '../utils/metodosPagoConfig'
import Swal from 'sweetalert2'

const Configuracion = () => {
  const { usuarios, loading: usuariosLoading } = useUsuarios()
  const { obtenerVentas } = useVentas()
  const { productos } = useProductos()
  const { clientes } = useClientes()
  const { obtenerComandas } = useComandas()

  const [metodosPagoConfig, setMetodosPagoConfig] = useState(() => obtenerMetodosPagoConfig())
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

        const hoy = new Date()
        const hace30Dias = new Date()
        hace30Dias.setDate(hace30Dias.getDate() - 30)

        const ventasRecientes = await obtenerVentas(
          hace30Dias.toISOString().split('T')[0],
          hoy.toISOString().split('T')[0]
        ).catch(() => [])

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

  const toggleMetodoPago = (id) => {
    const activos = Object.values(metodosPagoConfig).filter(Boolean).length
    if (metodosPagoConfig[id] && activos <= 1) {
      Swal.fire('Atención', 'Debe quedar al menos un método de pago activo', 'warning')
      return
    }
    const next = guardarMetodosPagoConfig({
      ...metodosPagoConfig,
      [id]: !metodosPagoConfig[id],
    })
    setMetodosPagoConfig(next)
  }

  const getRolLabel = (rol) => {
    const labels = {
      vendedor: 'Vendedor',
      cocina: 'Cocina',
      administrador: 'Administrador',
      superadministrador: 'Super Administrador',
    }
    return labels[rol] || rol
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
      {/* Categorías de movimiento */}
      <div className="card">
        <div className="flex items-center gap-3 mb-3">
          <Tags className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Categorías de movimiento
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Administra las categorías usadas en entradas y salidas de caja.
        </p>
        <Link
          to="/categorias-movimiento"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-matcha-500 text-white text-sm font-medium hover:bg-matcha-600 transition-colors"
        >
          Gestionar categorías
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Información del negocio */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Store className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Información del Negocio
          </h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del Negocio
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

      {/* Métodos de pago en Punto de Venta */}
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-5 h-5 text-matcha-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Métodos de pago en Punto de Venta
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Activa o desactiva qué botones de pago aparecen al cobrar.
        </p>
        <div className="space-y-3">
          {METODOS_PAGO_DISPONIBLES.map((metodo) => (
            <label
              key={metodo.id}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div>
                <p className="text-gray-900 font-medium">{metodo.label}</p>
                <p className="text-sm text-gray-500">
                  Botón en POS: “{metodo.boton}”
                </p>
              </div>
              <input
                type="checkbox"
                checked={!!metodosPagoConfig[metodo.id]}
                onChange={() => toggleMetodoPago(metodo.id)}
                className="w-4 h-4"
              />
            </label>
          ))}
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
    </div>
  )
}

export default Configuracion
