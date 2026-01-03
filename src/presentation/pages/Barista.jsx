import { useState, useEffect } from 'react'
import { CheckCircle, Clock, User, Package, Loader2, Coffee, Play } from 'lucide-react'
import { useComandas } from '../hooks/useComandas'
import { useProductos } from '../hooks/useProductos'
import Swal from 'sweetalert2'

const Barista = () => {
  const [comandas, setComandas] = useState([])
  const [cargando, setCargando] = useState(true) // Iniciar como true para la primera carga
  const [esPrimeraCarga, setEsPrimeraCarga] = useState(true)
  const { obtenerComandas, actualizarEstado, loading } = useComandas()
  const { productos } = useProductos()

  // Cargar comandas pendientes y en preparación (NO incluir terminadas)
  const cargarComandas = async (esRefresh = false) => {
    try {
      // Solo mostrar loader en la primera carga, no en los refrescos automáticos
      if (!esRefresh) {
        setCargando(true)
      }
      
      // Obtener solo comandas pendientes y en preparación (NO terminadas)
      const comandasPendientes = await obtenerComandas('pendiente')
      const comandasEnPreparacion = await obtenerComandas('en_preparacion')
      
      // Combinar y filtrar para asegurar que no haya terminadas
      const todasLasComandas = [
        ...(comandasPendientes || []),
        ...(comandasEnPreparacion || [])
      ]
        .filter(comanda => comanda.estado === 'pendiente' || comanda.estado === 'en_preparacion')
        .sort((a, b) => {
          const fechaA = new Date(a.fecha_creacion || a.fecha_venta)
          const fechaB = new Date(b.fecha_creacion || b.fecha_venta)
          return fechaA - fechaB
        })
      
      setComandas(todasLasComandas)
      
      // Marcar que ya no es la primera carga
      if (esPrimeraCarga) {
        setEsPrimeraCarga(false)
        setCargando(false)
      } else if (esRefresh) {
        // Si es un refresh, asegurarse de que el loading se desactive
        setCargando(false)
      }
    } catch (error) {
      console.error('Error al cargar comandas:', error)
      // Solo mostrar error en la primera carga o si es un error crítico
      if (esPrimeraCarga) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudieron cargar las comandas',
          confirmButtonColor: '#10b981',
        })
        setCargando(false)
      }
    }
  }

  useEffect(() => {
    // Cargar comandas al montar el componente
    cargarComandas(false)
    
    // Escuchar eventos de pago procesado
    const handlePagoProcesado = () => {
      // Esperar un momento para que el backend procese
      setTimeout(() => {
        cargarComandas(true)
      }, 500)
    }
    
    // Escuchar eventos de comanda actualizada (de otras instancias)
    const handleComandaActualizada = () => {
      cargarComandas(true)
    }
    
    // Escuchar los eventos personalizados
    window.addEventListener('pago-procesado', handlePagoProcesado)
    window.addEventListener('comanda-actualizada', handleComandaActualizada)
    
    // Limpiar los listeners al desmontar
    return () => {
      window.removeEventListener('pago-procesado', handlePagoProcesado)
      window.removeEventListener('comanda-actualizada', handleComandaActualizada)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Función para formatear fecha
  const formatFecha = (fechaString) => {
    if (!fechaString) return ''
    const fecha = new Date(fechaString)
    return fecha.toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Función para iniciar preparación
  const iniciarPreparacion = async (idComanda) => {
    try {
      const result = await Swal.fire({
        title: '¿Iniciar preparación?',
        text: 'Esta comanda pasará a estado "en preparación"',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, iniciar',
        cancelButtonText: 'Cancelar',
      })

      if (result.isConfirmed) {
        await actualizarEstado(idComanda, 'en_preparacion')
        
        // ✅ Refrescar la lista después de actualizar el estado
        await cargarComandas(true)
        
        // Notificar a otras instancias que se actualizó una comanda
        window.dispatchEvent(new CustomEvent('comanda-actualizada'))
        
        Swal.fire({
          icon: 'success',
          title: '¡Preparación iniciada!',
          text: 'La comanda está en preparación',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
      }
    } catch (error) {
      console.error('Error al iniciar preparación:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Error al iniciar preparación'
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    }
  }

  // Función para marcar comanda como terminada
  const marcarComoTerminada = async (idComanda) => {
    try {
      const result = await Swal.fire({
        title: '¿Marcar como terminada?',
        text: 'Esta comanda estará lista para entregar al cliente',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Sí, marcar como terminada',
        cancelButtonText: 'Cancelar',
      })

      if (result.isConfirmed) {
        const respuesta = await actualizarEstado(idComanda, 'terminada')
        
        // ✅ IMPORTANTE: Refrescar la lista para que la comanda terminada desaparezca
        await cargarComandas(true)
        
        // Notificar a otras instancias que se actualizó una comanda
        window.dispatchEvent(new CustomEvent('comanda-actualizada'))
        
        // Mostrar información detallada si hay insumos restados
        let mensaje = 'La comanda está lista para entregar.'
        if (respuesta?.insumos_restados && respuesta.insumos_restados.length > 0) {
          mensaje += `\n\nSe restaron ${respuesta.total_insumos_restados || respuesta.insumos_restados.length} insumo(s) del inventario.`
        } else {
          mensaje += '\n\nLos insumos se han restado automáticamente del inventario.'
        }
        
        Swal.fire({
          icon: 'success',
          title: '¡Comanda terminada!',
          text: mensaje,
          confirmButtonColor: '#10b981',
          timer: 3000,
        })
      }
    } catch (error) {
      console.error('Error al marcar como terminada:', error)
      const errorMsg = error.response?.data?.detail || error.response?.data?.error || error.message || 'Error al marcar como terminada'
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    }
  }

  // Obtener nombre del producto
  const obtenerNombreProducto = (idProducto) => {
    const producto = productos.find(p => p.id_producto === idProducto)
    return producto?.nombre || `Producto #${idProducto}`
  }

  // Obtener color del estado
  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700'
      case 'en_preparacion':
        return 'bg-blue-100 text-blue-700'
      case 'terminada':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  // Obtener etiqueta del estado
  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente'
      case 'en_preparacion':
        return 'En Preparación'
      case 'terminada':
        return 'Terminada'
      default:
        return estado
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Coffee className="w-8 h-8 text-matcha-600" />
          Barista
        </h1>
        <p className="text-gray-600 mt-1">Gestiona las comandas pagadas y prepáralas para entregar</p>
      </div>

      {cargando && comandas.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        </div>
      ) : comandas.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 text-lg">No hay comandas pendientes</p>
          <p className="text-gray-400 text-sm mt-2">Las comandas pagadas aparecerán aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comandas.map((comanda) => {
            const itemsCount = comanda.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
            const estaEnPreparacion = comanda.estado === 'en_preparacion'
            
            return (
              <div
                key={comanda.id_comanda}
                className="card hover:shadow-lg transition-shadow duration-200"
              >
                {/* Header de la comanda */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-matcha-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                      Comanda #{comanda.id_comanda}
                    </h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(comanda.estado)}`}>
                    {getEstadoLabel(comanda.estado)}
                  </span>
                </div>

                {/* Nombre del cliente - Siempre visible y destacado */}
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-matcha-600" />
                    <span className="text-base font-semibold text-gray-900">
                      {comanda.preorden?.nombre_cliente || comanda.venta?.nombre_cliente || 'Cliente no especificado'}
                    </span>
                  </div>
                </div>

                {/* Información del cliente y venta */}
                <div className="mb-4 pb-4 border-b border-gray-200 space-y-2">
                  {/* Tipo de servicio (de pre-orden o venta) */}
                  {(comanda.preorden?.tipo_servicio || comanda.venta?.tipo_servicio) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Servicio:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        (comanda.preorden?.tipo_servicio || comanda.venta?.tipo_servicio) === 'comer-aqui' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {(comanda.preorden?.tipo_servicio || comanda.venta?.tipo_servicio) === 'comer-aqui' ? 'Comer aquí' : 'Para llevar'}
                      </span>
                    </div>
                  )}
                  
                  {/* Información de leche (de pre-orden o venta) - Resaltada si es deslactosada */}
                  {((comanda.preorden?.tipo_leche || comanda.venta?.tipo_leche) || 
                    (comanda.preorden?.extra_leche || comanda.venta?.extra_leche)) && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {(comanda.preorden?.tipo_leche || comanda.venta?.tipo_leche) && (
                        <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                          (comanda.preorden?.tipo_leche || comanda.venta?.tipo_leche)?.toLowerCase() === 'deslactosada'
                            ? 'bg-orange-200 text-orange-900 border-2 border-orange-400'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          Leche: {comanda.preorden?.tipo_leche || comanda.venta?.tipo_leche}
                        </span>
                      )}
                      {(comanda.preorden?.extra_leche || comanda.venta?.extra_leche) && (
                        <span className="text-xs text-gray-600">
                          Extra: ${parseFloat(comanda.preorden?.extra_leche || comanda.venta?.extra_leche || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {/* Comentarios (de pre-orden o venta) */}
                  {(comanda.preorden?.comentarios || comanda.venta?.comentarios) && (
                    <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-xs font-medium text-yellow-800 mb-1">Comentarios:</p>
                      <p className="text-xs text-yellow-700 italic">
                        {comanda.preorden?.comentarios || comanda.venta?.comentarios}
                      </p>
                    </div>
                  )}
                  
                  {/* Venta y fecha */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Venta #</span>
                      <span className="text-xs font-medium text-gray-900">{comanda.id_venta}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{formatFecha(comanda.fecha_creacion || comanda.fecha_venta)}</span>
                    </div>
                  </div>
                </div>

                {/* Items de la comanda */}
                <div className="mb-4 space-y-2 max-h-64 overflow-y-auto">
                  <p className="text-sm font-medium text-gray-700 mb-2">Items ({itemsCount}):</p>
                  {comanda.detalles?.map((detalle, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {detalle.producto_nombre || obtenerNombreProducto(detalle.id_producto)}
                        </p>
                        {detalle.observaciones && (
                          <p className="text-xs text-gray-500 italic mt-1">
                            {detalle.observaciones}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          x{detalle.cantidad}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-matcha-600">
                      ${parseFloat(comanda.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="space-y-2">
                  {!estaEnPreparacion && (
                    <button
                      onClick={() => iniciarPreparacion(comanda.id_comanda)}
                      disabled={loading}
                      className="btn-outline w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Iniciar Preparación
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => marcarComoTerminada(comanda.id_comanda)}
                    disabled={loading}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Terminado
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Barista
