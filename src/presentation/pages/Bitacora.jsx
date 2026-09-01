import { useState, useEffect } from 'react'
import { useBitacora } from '../hooks/useBitacora'
import HistorialCaja from './HistorialCaja'
import { 
  FileText, Search, Filter, Loader2, ChevronDown, ChevronUp, Eye, X,
  User, Calendar, Activity, Package, ShoppingCart, Users, Settings, Warehouse,
  History
} from 'lucide-react'

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
        return 'bg-green-100 text-green-700 border-green-300'
      case 'logout':
        return 'bg-gray-100 text-gray-700 border-gray-300'
      case 'create':
        return 'bg-blue-100 text-blue-700 border-blue-300'
      case 'update':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300'
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
    { value: 'preordenes', label: 'Pre-órdenes' },
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-matcha-600" />
            <h1 className="text-3xl font-bold text-gray-900">Bitácora</h1>
          </div>
          <p className="text-gray-600">
            {seccion === 'movimientos'
              ? 'Registro de todas las acciones realizadas en el sistema'
              : 'Aperturas, cierres y arqueos de caja'}
          </p>
        </div>

        {/* Secciones */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSeccion('movimientos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              seccion === 'movimientos' ? 'bg-matcha-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Movimientos del sistema
          </button>
          <button
            onClick={() => setSeccion('historial-caja')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              seccion === 'historial-caja' ? 'bg-matcha-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <History className="w-4 h-4" />
            Historial de Caja
          </button>
        </div>

        {seccion === 'historial-caja' && <HistorialCaja embedded />}

        {seccion === 'movimientos' && (
        <>
        {/* Filtros */}
        <div className="card mb-6">
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-matcha-600" />
              <span className="font-semibold text-gray-900">Filtros de Búsqueda</span>
            </div>
            {mostrarFiltros ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>

          {mostrarFiltros && (
            <div className="border-t border-gray-200 pt-4 mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID Usuario
                </label>
                <input
                  type="number"
                  value={filtros.id_usuario}
                  onChange={(e) => setFiltros(prev => ({ ...prev, id_usuario: e.target.value }))}
                  className="input w-full"
                  placeholder="Filtrar por usuario"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Desde
                </label>
                <input
                  type="datetime-local"
                  value={filtros.fecha_desde}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha_desde: e.target.value }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Hasta
                </label>
                <input
                  type="datetime-local"
                  value={filtros.fecha_hasta}
                  onChange={(e) => setFiltros(prev => ({ ...prev, fecha_hasta: e.target.value }))}
                  className="input w-full"
                />
              </div>

              <div className="md:col-span-3 flex gap-3">
                <button
                  onClick={aplicarFiltros}
                  className="btn-primary flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Aplicar Filtros
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
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Registros de Movimientos</h2>
              <p className="text-sm text-gray-600">Total: {total} registros</p>
            </div>
            {loading && (
              <Loader2 className="w-5 h-5 animate-spin text-matcha-600" />
            )}
          </div>

          {loading && registros.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No se encontraron registros</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {registros.map((registro) => (
                  <div
                    key={registro.id_bitacora}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
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

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{obtenerNombreCompleto(registro)}</span>
                            <span className="text-gray-400">({registro.rol})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatearFecha(registro.fecha_hora)}</span>
                          </div>
                        </div>

                        {registro.descripcion && (
                          <p className="text-sm text-gray-700 mb-2">{registro.descripcion}</p>
                        )}

                        {(registro.valores_antes || registro.valores_despues) && (
                          <button
                            onClick={() => setRegistroExpandido(
                              registroExpandido === registro.id_bitacora ? null : registro.id_bitacora
                            )}
                            className="text-sm text-matcha-600 hover:text-matcha-700 flex items-center gap-1"
                          >
                            {registroExpandido === registro.id_bitacora ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Ocultar detalles
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                Ver detalles de cambios
                              </>
                            )}
                          </button>
                        )}

                        {registroExpandido === registro.id_bitacora && (
                          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                            {registro.valores_antes && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-1">Valores Antes:</h4>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(registro.valores_antes, null, 2)}
                                </pre>
                              </div>
                            )}
                            {registro.valores_despues && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 mb-1">Valores Después:</h4>
                                <pre className="bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(registro.valores_despues, null, 2)}
                                </pre>
                              </div>
                            )}
                            {registro.ip_address && (
                              <div className="text-xs text-gray-500">
                                IP: {registro.ip_address}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {total > filtros.limite && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Mostrando {filtros.offset + 1} - {Math.min(filtros.offset + filtros.limite, total)} de {total}
                  </div>
                  <div className="flex gap-2">
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
