import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, User, Package, Loader2, Plus } from 'lucide-react'
import { useComandas } from '../hooks/useComandas'
import { useProductos } from '../hooks/useProductos'
import { useInventario } from '../hooks/useInventario'
import Swal from 'sweetalert2'

const INTERVALO_REFRESCO_MS = 15000

const Barista = () => {
  const [comandas, setComandas] = useState([])
  const [cargando, setCargando] = useState(true) // Iniciar como true para la primera carga
  const [esPrimeraCarga, setEsPrimeraCarga] = useState(true)
  const navigate = useNavigate()
  const { obtenerComandas, actualizarEstado, loading } = useComandas()
  const { productos } = useProductos()
  const { insumos } = useInventario()

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
      if (import.meta.env.DEV) {
        console.error('Error al cargar comandas:', error)
      }
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

    // Los eventos solo llegan desde esta misma pestaña. Como el mesero manda
    // órdenes desde otra tablet, sin sondeo el barista no las ve hasta salir
    // y volver a entrar a la vista.
    const intervalo = setInterval(() => cargarComandas(true), INTERVALO_REFRESCO_MS)

    // Al volver a la pestaña, refrescar de inmediato en vez de esperar el ciclo.
    const handleVisibilidad = () => {
      if (document.visibilityState === 'visible') cargarComandas(true)
    }
    document.addEventListener('visibilitychange', handleVisibilidad)

    // Limpiar los listeners al desmontar
    return () => {
      window.removeEventListener('pago-procesado', handlePagoProcesado)
      window.removeEventListener('comanda-actualizada', handleComandaActualizada)
      document.removeEventListener('visibilitychange', handleVisibilidad)
      clearInterval(intervalo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // En barista solo importa la hora: la comanda siempre es del turno actual
  const formatHora = (fechaString) => {
    if (!fechaString) return ''
    return new Date(fechaString).toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Función auxiliar para obtener nombre del insumo por ID
  const obtenerNombreInsumo = (idInsumo) => {
    const insumo = insumos.find(i => i.id_insumo === idInsumo)
    return insumo?.nombre || `Insumo #${idInsumo}`
  }

  // Función para parsear errores de stock y extraer información
  const parsearErroresStock = (errores) => {
    if (!Array.isArray(errores)) return []
    
    return errores
      .filter(error => error.includes('stock insuficiente'))
      .map(error => {
        // Formato nuevo (backend con nombre): "Nombre del insumo: stock insuficiente (tiene X unidad, necesita Y unidad)"
        const matchNuevo = error.match(/^(.+?): stock insuficiente \(tiene ([-\d.]+) (\w+), necesita ([\d.]+) (\w+)\)$/)
        if (matchNuevo) {
          const [, nombre, cantidadActual, unidadActual, cantidadNecesaria, unidadNecesaria] = matchNuevo
          return {
            idInsumo: null,
            nombre: nombre.trim(),
            cantidadActual: parseFloat(cantidadActual),
            unidadActual,
            cantidadNecesaria: parseFloat(cantidadNecesaria),
            unidadNecesaria,
            mensajeCompleto: error
          }
        }
        // Formato legacy: "Insumo ID {id}: stock insuficiente (tiene X unidad, necesita Y unidad)"
        const matchLegacy = error.match(/Insumo ID (\d+): stock insuficiente \(tiene ([-\d.]+) (\w+), necesita ([\d.]+) (\w+)\)/)
        if (matchLegacy) {
          const [, idInsumo, cantidadActual, unidadActual, cantidadNecesaria, unidadNecesaria] = matchLegacy
          return {
            idInsumo: parseInt(idInsumo),
            nombre: obtenerNombreInsumo(parseInt(idInsumo)),
            cantidadActual: parseFloat(cantidadActual),
            unidadActual,
            cantidadNecesaria: parseFloat(cantidadNecesaria),
            unidadNecesaria,
            mensajeCompleto: error
          }
        }
        return {
          mensajeCompleto: error
        }
      })
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
        try {
          const respuesta = await actualizarEstado(idComanda, 'terminada')
          
          // Verificar si la respuesta contiene errores de stock
          if (respuesta?.error && respuesta?.errores) {
            const erroresStock = parsearErroresStock(respuesta.errores)
            
            if (erroresStock.length > 0) {
              // Construir HTML para mostrar los insumos con problemas
              let htmlContent = '<div style="text-align: left;">'
              htmlContent += '<ul style="list-style: none; padding: 0; margin: 0;">'
              
              erroresStock.forEach((error) => {
                if (error.nombre && (error.cantidadActual != null || error.cantidadNecesaria != null)) {
                  htmlContent += `<li style="padding: 10px; margin-bottom: 8px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">`
                  htmlContent += `<strong style="color: #991b1b;">${error.nombre}</strong><br/>`
                
                } else {
                  htmlContent += `<li style="padding: 10px; margin-bottom: 8px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">`
                  htmlContent += `<span style="color: #7f1d1d;">${error.mensajeCompleto}</span></li>`
                }
              })
              
              
              
              const resultStock = await Swal.fire({
                icon: 'warning',
                title: 'Stock Insuficiente',
                html: htmlContent,
                showCancelButton: true,
                showDenyButton: true,
                showConfirmButton: false,
                cancelButtonText: 'Cancelar',
                denyButtonText: 'Continuar de todos modos',
                denyButtonColor: '#7f1d1d',
                cancelButtonColor: '#6b7280',
                width: '600px'
              })
              
              if (resultStock.isDenied) {
                // Usuario eligió "Continuar de todos modos" - llamar API con permitir stock negativo
                const respuestaContinuar = await actualizarEstado(idComanda, 'terminada', true)
                if (respuestaContinuar?.error && !respuestaContinuar?.estado) {
                  await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: respuestaContinuar.error,
                    confirmButtonColor: '#10b981',
                  })
                  await cargarComandas(true)
                  return
                }
                // Éxito - continuar con flujo normal de comanda terminada
                await cargarComandas(true)
                window.dispatchEvent(new CustomEvent('comanda-actualizada'))
                window.dispatchEvent(new CustomEvent('comanda-terminada', { detail: { id_comanda: idComanda } }))
                if (respuestaContinuar?.venta_sin_pagar) {
                  window.dispatchEvent(new CustomEvent('comanda-lista-para-cobrar', {
                    detail: {
                      id_comanda: idComanda,
                      id_venta: respuestaContinuar.id_venta,
                      numero_dia: respuestaContinuar.numero_dia,
                      nombre_cliente: respuestaContinuar.nombre_cliente
                    }
                  }))
                }
                await Swal.fire({
                  icon: 'success',
                  title: '¡Comanda terminada!',
                  text: 'La comanda está lista para entregar. Recuerda actualizar el inventario para corregir las cantidades negativas.',
                  confirmButtonColor: '#10b981',
                  timer: 3000,
                })
              }
              await cargarComandas(true)
              return
            }
          }
          
          // ✅ IMPORTANTE: Refrescar la lista para que la comanda terminada desaparezca
          await cargarComandas(true)
          
          // Notificar a otras instancias que se actualizó una comanda
          window.dispatchEvent(new CustomEvent('comanda-actualizada'))
          
          // ✅ Disparar evento para verificar stock inmediatamente después de terminar comanda
          window.dispatchEvent(new CustomEvent('comanda-terminada', {
            detail: { id_comanda: idComanda }
          }))
          // Si la venta estaba sin pagar, notificar al Punto de Venta para cobrar
          if (respuesta?.venta_sin_pagar) {
            window.dispatchEvent(new CustomEvent('comanda-lista-para-cobrar', {
              detail: {
                id_comanda: idComanda,
                id_venta: respuesta.id_venta,
                numero_dia: respuesta.numero_dia,
                nombre_cliente: respuesta.nombre_cliente
              }
            }))
          }
          
          // Mostrar información detallada si hay insumos restados
          let mensaje = 'La comanda está lista para entregar.'
          if (respuesta?.insumos_restados && respuesta.insumos_restados.length > 0) {
            mensaje += `\n\nSe restaron ${respuesta.total_insumos_restados || respuesta.insumos_restados.length} insumo(s) del inventario.`
          } else {
            mensaje += '\n\nLos insumos se han restado automáticamente del inventario.'
          }
          
          await Swal.fire({
            icon: 'success',
            title: '¡Comanda terminada!',
            text: mensaje,
            confirmButtonColor: '#10b981',
            timer: 3000,
          })
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Error al marcar como terminada:', error)
          }
          
          // Verificar si el error contiene información sobre stock insuficiente
          const errorData = error.response?.data
          if (errorData?.errores) {
            const erroresStock = parsearErroresStock(errorData.errores)
            
            if (erroresStock.length > 0) {
              // Construir HTML para mostrar los insumos con problemas
              let htmlContent = '<div style="text-align: left;">'
              htmlContent += '<p style="margin-bottom: 15px; font-weight: 600; color: #dc2626;">No se puede terminar la comanda porque los siguientes insumos tienen stock insuficiente:</p>'
              htmlContent += '<ul style="list-style: none; padding: 0; margin: 0;">'
              
              erroresStock.forEach((error) => {
                if (error.nombre && (error.cantidadActual != null || error.cantidadNecesaria != null)) {
                  htmlContent += `<li style="padding: 10px; margin-bottom: 8px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">`
                  htmlContent += `<strong style="color: #991b1b;">${error.nombre}</strong><br/>`
                  
                } else {
                  htmlContent += `<li style="padding: 10px; margin-bottom: 8px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">`
                  htmlContent += `<span style="color: #7f1d1d;">${error.mensajeCompleto}</span></li>`
                }
              })
              
              
              
              const resultStockCatch = await Swal.fire({
                icon: 'warning',
                title: 'Stock Insuficiente',
                html: htmlContent,
                showCancelButton: true,
                showDenyButton: true,
                showConfirmButton: false,
                cancelButtonText: 'Entendido',
                denyButtonText: 'Continuar de todos modos',
                denyButtonColor: '#10b981',
                cancelButtonColor: '#6b7280',
                width: '600px'
              })
              
              if (resultStockCatch.isDenied) {
                try {
                  const respuestaContinuar = await actualizarEstado(idComanda, 'terminada', true)
                  if (respuestaContinuar?.error && !respuestaContinuar?.estado) {
                    await Swal.fire({
                      icon: 'error',
                      title: 'Error',
                      text: respuestaContinuar.error,
                      confirmButtonColor: '#10b981',
                    })
                  } else {
                    await cargarComandas(true)
                    window.dispatchEvent(new CustomEvent('comanda-actualizada'))
                    window.dispatchEvent(new CustomEvent('comanda-terminada', { detail: { id_comanda: idComanda } }))
                    if (respuestaContinuar?.venta_sin_pagar) {
                      window.dispatchEvent(new CustomEvent('comanda-lista-para-cobrar', {
                        detail: {
                          id_comanda: idComanda,
                          id_venta: respuestaContinuar.id_venta,
                          numero_dia: respuestaContinuar.numero_dia,
                          nombre_cliente: respuestaContinuar.nombre_cliente
                        }
                      }))
                    }
                    await Swal.fire({
                      icon: 'success',
                      title: '¡Comanda terminada!',
                      text: 'La comanda está lista para entregar. Recuerda actualizar el inventario para corregir las cantidades negativas.',
                      confirmButtonColor: '#10b981',
                      timer: 3000,
                    })
                  }
                } catch (errContinuar) {
                  await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errContinuar.response?.data?.detail || errContinuar.message || 'Error al terminar la comanda',
                    confirmButtonColor: '#10b981',
                  })
                }
              }
              await cargarComandas(true)
              return
            }
          }
          
          // Si no es un error de stock, mostrar el error genérico
          const errorMsg = errorData?.detail || errorData?.error || error.message || 'Error al marcar como terminada'
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMsg,
            confirmButtonColor: '#10b981',
          })
        }
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error inesperado al marcar como terminada:', error)
      }
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un error inesperado. Por favor, intenta nuevamente.',
        confirmButtonColor: '#10b981',
      })
    }
  }

  // Obtener nombre del producto
  const obtenerNombreProducto = (idProducto) => {
    const producto = productos.find(p => p.id_producto === idProducto)
    return producto?.nombre || `Producto #${idProducto}`
  }

  return (
    <div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
          {comandas.map((comanda) => {
            const itemsCount = comanda.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
            // Si ya se entregó parte, lo pendiente es una segunda ronda: hay que distinguirla
            const tieneEntregados = comanda.detalles?.some((d) => d.entregado)
            const tipoServicio = comanda.pedido?.tipo_servicio || comanda.venta?.tipo_servicio
            const comentarios = comanda.pedido?.comentarios || comanda.venta?.comentarios
            const tipoLecheGlobal = comanda.pedido?.tipo_leche || comanda.venta?.tipo_leche
            const mostrarLecheGlobal =
              tipoLecheGlobal &&
              !comanda.detalles?.some(
                (d) => d.observaciones && (d.observaciones.includes('Leche') || d.observaciones.includes('Extras:'))
              )

            return (
              <div
                key={comanda.id_comanda}
                className="card !p-3 flex flex-col hover:shadow-lg transition-shadow duration-200"
              >
                {/* Encabezado: número, cliente y estado en una sola franja */}
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <span className="shrink-0 bg-matcha-100 text-matcha-800 rounded-lg w-9 h-9 flex items-center justify-center text-base font-bold">
                    {comanda.numero_dia ?? comanda.id_comanda}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-matcha-600 shrink-0" />
                      {comanda.pedido?.nombre_cliente || comanda.venta?.nombre_cliente || 'Sin nombre'}
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 shrink-0" />
                      {formatHora(comanda.fecha_creacion || comanda.fecha_venta)}
                      <span>·</span>
                      <span>{itemsCount} items</span>
                      <span>·</span>
                      <span className="font-medium text-gray-700">
                        ${parseFloat(comanda.total || 0).toFixed(2)}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {tipoServicio && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          tipoServicio === 'comer-aqui'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {tipoServicio === 'comer-aqui' ? 'Comer aquí' : 'Para llevar'}
                      </span>
                    )}
                    {(comanda.venta_pagada === 0 || comanda.venta_pagada === false) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300">
                        Sin pagar
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => navigate('/punto-venta', { state: { editarComandaId: comanda.id_comanda } })}
                    className="shrink-0 p-2 rounded-lg border-2 border-blue-500/50 text-blue-600 hover:bg-blue-500/10 transition-colors"
                    title="Agregar más productos a esta comanda"
                    aria-label="Agregar productos a la comanda"
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>

                {mostrarLecheGlobal && (
                  <div className="pt-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        tipoLecheGlobal?.toLowerCase() === 'deslactosada'
                          ? 'bg-orange-200 text-orange-900 border border-orange-400'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      Leche: {tipoLecheGlobal}
                    </span>
                  </div>
                )}

                {/* Items: una fila por producto, sin card individual */}
                <div className="flex-1 min-h-0 max-h-72 overflow-y-auto divide-y divide-gray-100 py-1">
                  {comanda.detalles?.map((detalle, index) => {
                    const observaciones = detalle.observaciones ? detalle.observaciones.split(' - ') : []
                    const tipoLecheObs = observaciones.find(obs => obs.includes('Leche'))
                    const extrasObs = observaciones.find(obs => obs.includes('Extras:'))
                    const tipoProteinaObs = observaciones.find(obs => obs.includes('Proteína:') || obs.includes('Proteina:') || obs.includes('Scoop:'))
                    const tipoPreparacion = detalle.tipo_preparacion
                    const otrasObs = observaciones.filter(obs =>
                      !obs.includes('Leche') &&
                      !obs.includes('Extras:') &&
                      !obs.includes('Preparación:') &&
                      !obs.includes('Scoop:') &&
                      !obs.includes('Proteína:') &&
                      !obs.includes('Proteina:')
                    )
                    const tieneDetalles = tipoPreparacion || tipoLecheObs || extrasObs || tipoProteinaObs || otrasObs.length > 0

                    const yaEntregado = Boolean(detalle.entregado)

                    return (
                      <div
                        key={index}
                        className={`flex items-start gap-2 py-1.5 ${yaEntregado ? 'opacity-50' : ''}`}
                      >
                        <span className={`shrink-0 text-sm font-bold tabular-nums ${yaEntregado ? 'text-gray-400' : 'text-gray-800'}`}>
                          {detalle.cantidad}×
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-snug ${yaEntregado ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {detalle.producto_nombre || obtenerNombreProducto(detalle.id_producto)}
                          </p>
                          {tieneEntregados && !yaEntregado && (
                            <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-300">
                              NUEVO
                            </span>
                          )}
                          {tieneDetalles && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {tipoPreparacion && (
                                <span className={`px-1.5 py-px rounded text-[10px] font-semibold border ${
                                  tipoPreparacion === 'heladas'
                                    ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                                    : 'bg-orange-100 text-orange-700 border-orange-300'
                                }`}>
                                  {tipoPreparacion === 'heladas' ? 'Frío' : 'Frapeada'}
                                </span>
                              )}
                              {tipoLecheObs && (
                                <span className="px-1.5 py-px rounded text-[10px] font-semibold bg-blue-100 text-blue-700 border border-blue-300">
                                  {tipoLecheObs}
                                </span>
                              )}
                              {tipoProteinaObs && (
                                <span className="px-1.5 py-px rounded text-[10px] font-semibold bg-yellow-100 text-yellow-700 border border-yellow-300">
                                  {tipoProteinaObs}
                                </span>
                              )}
                              {extrasObs && (
                                <span className="px-1.5 py-px rounded text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-300">
                                  {extrasObs.replace('Extras: ', '')}
                                </span>
                              )}
                              {otrasObs.map((obs, obsIndex) => (
                                <span key={obsIndex} className="text-[10px] text-gray-600 italic">
                                  {obs}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {comentarios && (
                  <p className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-[11px] text-yellow-800 italic">
                    {comentarios}
                  </p>
                )}

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => marcarComoTerminada(comanda.id_comanda)}
                    disabled={loading}
                    className="px-7 py-2 rounded-lg border-2 border-matcha-500 bg-matcha-500/15 text-matcha-700 hover:bg-matcha-500/25 active:bg-matcha-500/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Marcar como listo y entregado; la mesa queda abierta en el punto de venta"
                    aria-label="Marcar comanda como lista"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckCircle className="w-5 h-5" />
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
