import { useState, useEffect } from 'react'
import { useBitacora } from '../hooks/useBitacora'
import HistorialCaja from './HistorialCaja'
import { 
  FileText, Search, Filter, Loader2, ChevronDown, ChevronUp, Eye, X,
  User, Calendar, Activity, Package, ShoppingCart, Users, Settings, Warehouse,
  History
} from 'lucide-react'

/**
 * Campos que ya se leen en la tarjeta: el rol aparece junto al nombre y el
 * autorizador dentro de la descripción. Repetirlos en el detalle solo estorba,
 * y cuando no hubo autorización se ven como "null", que no le dice nada a nadie.
 */
const CAMPOS_REDUNDANTES = new Set([
  'rol_solicitante',
  'autorizado_por',
  'autorizado_por_nombre',
])

const ETIQUETAS_CAMPO = {
  descuento_tipo: 'Tipo de descuento',
  descuento_valor: 'Valor aplicado',
  total_descuento: 'Monto descontado',
  porcentaje_efectivo: 'Porcentaje real',
  total_cancelado: 'Monto cancelado',
}

const CAMPOS_MONEDA = new Set(['total_descuento', 'total_cancelado'])
const CAMPOS_PORCENTAJE = new Set(['porcentaje_efectivo'])

const etiquetaCampo = (clave) =>
  ETIQUETAS_CAMPO[clave] ||
  clave.replace(/_/g, ' ').replace(/^./, (letra) => letra.toUpperCase())

const formatearValor = (clave, valor) => {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No'
  if (typeof valor === 'object') return JSON.stringify(valor)
  if (CAMPOS_MONEDA.has(clave)) return `$${Number(valor).toFixed(2)}`
  if (CAMPOS_PORCENTAJE.has(clave)) return `${valor}%`
  return String(valor)
}

/** Convierte el JSON crudo en filas legibles, descartando lo vacío y lo repetido. */
const detallesLegibles = (valores) => {
  // El backend normalmente ya entrega objetos, pero si el JSON viniera mal
  // formado lo deja como texto; en ese caso más vale mostrarlo que perderlo.
  if (typeof valores === 'string') {
    try {
      valores = JSON.parse(valores)
    } catch {
      return [{ clave: 'detalle', etiqueta: 'Detalle', texto: valores }]
    }
  }
  if (!valores || typeof valores !== 'object') return []
  return Object.entries(valores)
    .filter(
      ([clave, valor]) =>
        !CAMPOS_REDUNDANTES.has(clave) &&
        valor !== null &&
        valor !== undefined &&
        valor !== ''
    )
    .map(([clave, valor]) => ({
      clave,
      etiqueta: etiquetaCampo(clave),
      texto: formatearValor(clave, valor),
    }))
}

const Bitacora = () => {
  const { obtenerBitacora, loading } = useBitacora()
  const [seccion, setSeccion] = useState('movimientos')
  const [registros, setRegistros] = useState([])
  const [total, setTotal] = useState(0)
  const [registroExpandido, setRegistroExpandido] = useState(null)
  const [filtros, setFiltros] = useState({
    id_usuario: '',
    modulo: '',
    tipo_movimiento: '',
    entidad_tipo: '',
    fecha_desde: '',
    fecha_hasta: '',
    limite: 100,
    offset: 0
  })
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

  const cargarBitacora = async () => {
    try {
      const params = {}
      if (filtros.id_usuario) params.id_usuario = parseInt(filtros.id_usuario)
      if (filtros.modulo) params.modulo = filtros.modulo
      if (filtros.tipo_movimiento) params.tipo_movimiento = filtros.tipo_movimiento
      if (filtros.entidad_tipo) params.entidad_tipo = filtros.entidad_tipo
      if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde
      if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta
      if (filtros.limite) params.limite = filtros.limite
      if (filtros.offset) params.offset = filtros.offset

      const resultado = await obtenerBitacora(params)
      setRegistros(resultado.registros || [])
      setTotal(resultado.total || 0)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error al cargar bitácora:', error)
      }
    }
  }

  useEffect(() => {
    cargarBitacora()
  }, [filtros.offset])

  const aplicarFiltros = () => {
    setFiltros(prev => ({ ...prev, offset: 0 }))
    cargarBitacora()
  }

  const limpiarFiltros = () => {
    setFiltros({
      id_usuario: '',
      modulo: '',
      tipo_movimiento: '',
      entidad_tipo: '',
      fecha_desde: '',
      fecha_hasta: '',
      limite: 100,
      offset: 0
    })
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '-'
    const date = new Date(fecha)
    return date.toLocaleString('es-MX', { 
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const obtenerIconoTipo = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'login':
      case 'logout':
        return <Activity className="w-4 h-4" />
      case 'create':
        return <User className="w-4 h-4" />
      case 'update':
        return <Package className="w-4 h-4" />
      case 'delete':
        return <X className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const obtenerColorTipo = (tipo) => {
    switch (tipo?.toLowerCase()) {
      case 'login':
        return 'bg-marca-100 text-marca-700 border-marca-300'
      case 'logout':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'create':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'update':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'delete':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'read':
        return 'bg-purple-100 text-purple-700 border-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  const obtenerNombreCompleto = (usuario) => {
    if (!usuario) return 'Usuario desconocido'
    const nombre = usuario.nombre || ''
    const apellidoP = usuario.apellido_paterno || ''
    const apellidoM = usuario.apellido_materno || ''
    return `${nombre} ${apellidoP} ${apellidoM}`.trim()
  }

  const modulos = [
    { value: '', label: 'Todos' },
    { value: 'usuarios', label: 'Usuarios' },
    { value: 'productos', label: 'Productos' },
    { value: 'ventas', label: 'Ventas' },
    { value: 'comandas', label: 'Comandas' },
    { value: 'inventario', label: 'Inventario' },
    { value: 'clientes', label: 'Clientes' },
    { value: 'autenticacion', label: 'Autenticación' }
  ]

  const tiposMovimiento = [
    { value: '', label: 'Todos' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'create', label: 'Crear' },
    { value: 'update', label: 'Actualizar' },
    { value: 'delete', label: 'Eliminar' },
    { value: 'read', label: 'Leer' },
    { value: 'process', label: 'Procesar' },
    { value: 'cancel', label: 'Cancelar' }
  ]

  return (
    <div className="min-w-0 max-w-full lg:p-2">
      <div className="max-w-7xl mx-auto min-w-0">
        {/* Secciones */}
        <div className="grid grid-cols-2 gap-2 mb-4 sm:flex sm:flex-wrap sm:mb-6">
          <button
            onClick={() => setSeccion('movimientos')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium leading-tight transition-colors sm:px-4 ${
              seccion === 'movimientos' ? 'bg-marca-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Movimientos</span>
            <span className="hidden sm:inline">Movimientos del sistema</span>
          </button>
          <button
            onClick={() => setSeccion('historial-caja')}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium leading-tight transition-colors sm:px-4 ${
              seccion === 'historial-caja' ? 'bg-marca-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History className="w-4 h-4 shrink-0" />
            Historial de Caja
          </button>
        </div>

        {seccion === 'historial-caja' && <HistorialCaja embedded />}

        {seccion === 'movimientos' && (
        <>
        {/* Filtros */}
        <div className="card mb-4 overflow-x-hidden !p-3 sm:mb-6 sm:!p-4">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            aria-expanded={mostrarFiltros}
            className="w-full flex items-center justify-between p-1 rounded-lg transition-colors sm:p-2"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-marca-600" />
              <span className="font-semibold text-gray-900">Filtros de Búsqueda</span>
            </div>
            {mostrarFiltros ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {mostrarFiltros && (
            <div className="border-t border-gray-200 pt-4 mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
              

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Módulo
                </label>
                <select
                  value={filtros.modulo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, modulo: e.target.value }))}
                  className="input w-full"
                >
                  {modulos.map(mod => (
                    <option key={mod.value} value={mod.value}>{mod.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Movimiento
                </label>
                <select
                  value={filtros.tipo_movimiento}
                  onChange={(e) => setFiltros(prev => ({ ...prev, tipo_movimiento: e.target.value }))}
                  className="input w-full"
                >
                  {tiposMovimiento.map(tipo => (
                    <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Entidad
                </label>
                <input
                  type="text"
                  value={filtros.entidad_tipo}
                  onChange={(e) => setFiltros(prev => ({ ...prev, entidad_tipo: e.target.value }))}
                  className="input w-full"
                  placeholder="Ej: Usuario, Producto, Venta"
                />
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-2 sm:col-span-2 md:col-span-2">
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Desde
                  </label>
                  <input
                    type="datetime-local"
                    value={filtros.fecha_desde}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                    className="input w-full min-w-0"
                  />
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hasta
                  </label>
                  <input
                    type="datetime-local"
                    value={filtros.fecha_hasta}
                    onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                    className="input w-full min-w-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2 sm:flex sm:gap-3 md:col-span-3">
                <button
                  onClick={aplicarFiltros}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Aplicar
                  <span className="hidden sm:inline">Filtros</span>
                </button>
                <button
                  onClick={limpiarFiltros}
                  className="btn-outline"
                >
                  Limpiar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resultados */}
        <div className="card min-w-0 !p-3 sm:!p-6">
          <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Registros de Movimientos</h2>
              <p className="text-sm text-gray-600">Total: {total} registros</p>
            </div>
            {loading && (
              <Loader2 className="w-5 h-5 animate-spin text-marca-600" />
            )}
          </div>

          {loading && registros.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron registros</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {registros.map((registro) => {
                  const detallesAntes = detallesLegibles(registro.valores_antes)
                  const detallesDespues = detallesLegibles(registro.valores_despues)
                  const hayDetalles = detallesAntes.length > 0 || detallesDespues.length > 0
                  const expandido = registroExpandido === registro.id_bitacora
                  return (
                  <div
                    key={registro.id_bitacora}
                    className="min-w-0 border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow sm:p-4"
                  >
                    <div className="flex items-start justify-between min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2 sm:gap-x-3">
                          {obtenerIconoTipo(registro.tipo_movimiento)}
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${obtenerColorTipo(registro.tipo_movimiento)}`}>
                            {registro.tipo_movimiento?.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{registro.modulo}</span>
                          {registro.entidad_tipo && (
                            <>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">{registro.entidad_tipo}</span>
                              {registro.entidad_id && (
                                <span className="text-sm text-gray-500">#{registro.entidad_id}</span>
                              )}
                            </>
                          )}
                        </div>

                        <div className="flex flex-col gap-1 text-sm text-gray-600 mb-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
                          <div className="flex min-w-0 items-center gap-1">
                            <User className="w-4 h-4 shrink-0" />
                            <span className="truncate font-medium">{obtenerNombreCompleto(registro)}</span>
                            <span className="shrink-0 text-gray-400">({registro.rol})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 shrink-0" />
                            <span className="whitespace-nowrap">{formatearFecha(registro.fecha_hora)}</span>
                          </div>
                        </div>

                        {registro.descripcion && (
                          <p className="text-sm text-gray-700 mb-2 break-words">{registro.descripcion}</p>
                        )}

                        {hayDetalles && (
                          <button
                            onClick={() => setRegistroExpandido(expandido ? null : registro.id_bitacora)}
                            className="text-sm text-marca-600 hover:text-marca-700 flex items-center gap-1"
                          >
                            {expandido ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Ocultar detalles
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Ver detalles
                              </>
                            )}
                          </button>
                        )}

                        {hayDetalles && expandido && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            {[
                              { titulo: 'Antes', filas: detallesAntes },
                              { titulo: 'Después', filas: detallesDespues },
                            ]
                              .filter(({ filas }) => filas.length > 0)
                              .map(({ titulo, filas }) => (
                                <div key={titulo}>
                                  {detallesAntes.length > 0 && detallesDespues.length > 0 && (
                                    <h4 className="text-xs font-semibold text-gray-700 mb-1">{titulo}</h4>
                                  )}
                                  <dl className="bg-gray-50 rounded px-3 py-2 text-xs divide-y divide-gray-200">
                                    {filas.map(({ clave, etiqueta, texto }) => (
                                      <div key={clave} className="flex justify-between gap-3 py-1">
                                        <dt className="shrink-0 text-gray-500">{etiqueta}</dt>
                                        <dd className="min-w-0 break-words text-gray-900 font-medium text-right">{texto}</dd>
                                      </div>
                                    ))}
                                  </dl>
                                </div>
                              ))}
                            {registro.ip_address && (
                              <div className="text-xs text-gray-400">IP: {registro.ip_address}</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* Paginación */}
              {total > filtros.limite && (
                <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-200 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-gray-600 text-center sm:text-left">
                    Mostrando {filtros.offset + 1} - {Math.min(filtros.offset + filtros.limite, total)} de {total}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button
                      onClick={() => setFiltros(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limite) }))}
                      disabled={filtros.offset === 0}
                      className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setFiltros(prev => ({ ...prev, offset: prev.offset + prev.limite }))}
                      disabled={filtros.offset + filtros.limite >= total}
                      className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  )
}

export default Bitacora
