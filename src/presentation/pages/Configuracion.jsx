import { useState } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Image,
  LayoutDashboard,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import {
  METODOS_PAGO_DISPONIBLES,
} from '../utils/metodosPagoConfig'
import { guardarPosConFotos, obtenerPosConFotos, vaciarCacheImagenes } from '../utils/posVistaConfig'
import {
  METRICAS_DASHBOARD,
  METRICAS_REPORTES,
  MODO_RESTAURANTE,
  MODO_TIENDA,
} from '../utils/preferenciasUi'
import { usePreferencias } from '../context/PreferenciasContext'
import OpcionesProductoConfig from '../components/OpcionesProductoConfig'
import CategoriasMovimiento from './CategoriasMovimiento'
import Swal from 'sweetalert2'

const grupoTitulo = {
  basicas: 'Básicas',
  restaurante: 'Solo restaurante / cafetería',
  metodos: 'Métodos de pago',
  nuevas: 'Sugeridas',
  graficos: 'Gráficos',
}

const ChecksMetricas = ({ titulo, catalogo, valores, onToggle, modoTienda }) => {
  const grupos = [...new Set(catalogo.map((m) => m.grupo))]
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
      {grupos.map((grupo) => (
        <div key={grupo} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {grupoTitulo[grupo] || grupo}
          </p>
          {catalogo.filter((m) => m.grupo === grupo).map((m) => {
            const deshabilitada = modoTienda && (m.id === 'propinas' || m.id === 'ordenes_activas')
            return (
              <label
                key={m.id}
                className={`flex items-center justify-between p-3 border border-gray-200 rounded-lg ${
                  deshabilitada ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
                }`}
              >
                <div>
                  <p className="text-gray-900 font-medium">{m.label}</p>
                  {deshabilitada && (
                    <p className="text-xs text-gray-500">Oculta en modo tienda</p>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={!!valores[m.id] && !deshabilitada}
                  disabled={deshabilitada}
                  onChange={() => onToggle(m.id)}
                  className="w-4 h-4 shrink-0 ml-3"
                />
              </label>
            )
          })}
        </div>
      ))}
    </div>
  )
}

const Configuracion = () => {
  const { preferencias, guardar, modoTienda } = usePreferencias()
  const [posConFotos, setPosConFotos] = useState(() => obtenerPosConFotos())
  const [guardando, setGuardando] = useState(false)
  const [metricasAbiertas, setMetricasAbiertas] = useState(false)

  const persistir = async (parcial, mensajeOk) => {
    setGuardando(true)
    try {
      await guardar(parcial)
      if (mensajeOk) {
        Swal.fire({
          icon: 'success',
          title: mensajeOk,
          timer: 1400,
          showConfirmButton: false,
        })
      }
    } catch (error) {
      Swal.fire(
        'Error',
        error?.response?.data?.detail || error?.message || 'No se pudo guardar',
        'error',
      )
    } finally {
      setGuardando(false)
    }
  }

  const cambiarModo = (modo) => {
    if (modo === preferencias.modo) return
    persistir({ modo }, modo === MODO_TIENDA ? 'Modo tienda activado' : 'Modo restaurante activado')
  }

  const toggleMetodoPago = (id) => {
    const actuales = { ...preferencias.metodos_pago }
    const activos = Object.values(actuales).filter(Boolean).length
    if (actuales[id] && activos <= 1) {
      Swal.fire('Atención', 'Debe quedar al menos un método de pago activo', 'warning')
      return
    }
    persistir({ metodos_pago: { ...actuales, [id]: !actuales[id] } })
  }

  const toggleMetrica = (seccion, id) => {
    const clave = seccion === 'dashboard' ? 'metricas_dashboard' : 'metricas_reportes'
    const actuales = { ...preferencias[clave] }
    persistir({ [clave]: { ...actuales, [id]: !actuales[id] } })
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <Store className="w-5 h-5 text-marca-600" />
          <h2 className="text-lg font-semibold text-gray-900">Tipo de negocio</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          En modo tienda se ocultan mesas,
          comandas, inventario, meseros, propinas, tipo de servicio y enviar a cocina.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            disabled={guardando}
            onClick={() => cambiarModo(MODO_RESTAURANTE)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
              preferencias.modo === MODO_RESTAURANTE
                ? 'border-marca-500 bg-marca-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5 text-marca-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Restaurante / cafetería</p>
              <p className="text-sm text-gray-500 mt-1">
                Mesas, comandas, meseros, propinas y tipo de servicio.
              </p>
            </div>
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={() => cambiarModo(MODO_TIENDA)}
            className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-colors ${
              preferencias.modo === MODO_TIENDA
                ? 'border-marca-500 bg-marca-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Store className="w-5 h-5 text-marca-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-900">Tienda / abarrotes</p>
              <p className="text-sm text-gray-500 mt-1">
                POS directo: cobra sin cocina, mesas ni propinas.
              </p>
            </div>
          </button>
        </div>
      </div>

      <CategoriasMovimiento />

      {!modoTienda && <OpcionesProductoConfig />}

      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <Image className="w-5 h-5 text-marca-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Punto de Venta
          </h2>
        </div>
        <p className="text-sm text-gray-500 mb-3">
          Las fotos se guardan en cada dispositivo para que el POS las muestre al instante,
          sin pedirlas al servidor cada vez.
        </p>
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

      <div className="card">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard className="w-5 h-5 text-marca-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Métodos de pago en Punto de Venta
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Se guarda en el servidor: al cambiarlo aquí, todos los dispositivos ven lo mismo.
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
                checked={!!preferencias.metodos_pago?.[metodo.id]}
                disabled={guardando}
                onChange={() => toggleMetodoPago(metodo.id)}
                className="w-4 h-4"
              />
            </label>
          ))}
        </div>
      </div>

      <div className="card min-w-0 overflow-hidden !p-4 sm:p-6">
        <button
          type="button"
          onClick={() => setMetricasAbiertas((v) => !v)}
          aria-expanded={metricasAbiertas}
          className="flex w-full items-center gap-3 text-left"
        >
          <LayoutDashboard className="w-5 h-5 text-marca-600 shrink-0" />
          <h2 className="flex-1 text-lg font-semibold text-gray-900">Métricas visibles</h2>
          {metricasAbiertas ? (
            <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
          )}
        </button>

        {metricasAbiertas && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-gray-600">
              Elige qué cards aparecen en el Dashboard y en Reportes. También puedes editarlas
              desde cada pantalla con el botón «Editar métricas».
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChecksMetricas
                titulo="Dashboard"
                catalogo={METRICAS_DASHBOARD}
                valores={preferencias.metricas_dashboard}
                modoTienda={modoTienda}
                onToggle={(id) => toggleMetrica('dashboard', id)}
              />
              <ChecksMetricas
                titulo="Reportes"
                catalogo={METRICAS_REPORTES}
                valores={preferencias.metricas_reportes}
                modoTienda={modoTienda}
                onToggle={(id) => toggleMetrica('reportes', id)}
              />
            </div>
          </div>
        )}
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
