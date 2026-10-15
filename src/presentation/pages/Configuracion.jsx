import { useState } from 'react'
import { Bell, CreditCard, Image } from 'lucide-react'
import {
  METODOS_PAGO_DISPONIBLES,
  obtenerMetodosPagoConfig,
  guardarMetodosPagoConfig,
} from '../utils/metodosPagoConfig'
import { guardarPosConFotos, obtenerPosConFotos, vaciarCacheImagenes } from '../utils/posVistaConfig'
import OpcionesProductoConfig from '../components/OpcionesProductoConfig'
import CategoriasMovimiento from './CategoriasMovimiento'
import Swal from 'sweetalert2'

const Configuracion = () => {
  const [metodosPagoConfig, setMetodosPagoConfig] = useState(() => obtenerMetodosPagoConfig())
  const [posConFotos, setPosConFotos] = useState(() => obtenerPosConFotos())

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

  return (
    <div className="space-y-6">
      <CategoriasMovimiento />

      <OpcionesProductoConfig />

      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <Image className="w-5 h-5 text-marca-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Punto de Venta
          </h2>
        </div>
        <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
          <div>
            <p className="text-gray-900 font-medium">Productos con foto</p>
            <p className="text-sm text-gray-500">
              Usa la foto guardada en cada producto. Si no tiene, la card muestra un icono.
            </p>
          </div>
          <input
            type="checkbox"
            checked={posConFotos}
            onChange={() => setPosConFotos(guardarPosConFotos(!posConFotos))}
            className="w-4 h-4 shrink-0 ml-3"
          />
        </label>
        <button
          type="button"
          onClick={async () => {
            try {
              await vaciarCacheImagenes()
              Swal.fire({
                icon: 'success',
                title: 'Fotos actualizadas',
                text: 'Se borraron las fotos guardadas. Al abrir el punto de venta se vuelven a buscar.',
                confirmButtonColor: 'rgb(var(--marca-500))',
              })
            } catch {
              Swal.fire('Error', 'No se pudieron borrar las fotos guardadas', 'error')
            }
          }}
          className="mt-3 text-sm font-medium text-marca-700 hover:text-marca-800"
        >
          Eliminar imágenes anteriores y descargar nuevas
        </button>
      </div>

      {/* Métodos de pago en Punto de Venta */}
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-5 h-5 text-marca-600" />
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
          <Bell className="w-5 h-5 text-marca-600" />
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
