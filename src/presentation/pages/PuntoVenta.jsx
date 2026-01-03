import { useState, useEffect } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Loader2, Package, Clock, User, CreditCard, X, Search } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { usePreordenes } from '../hooks/usePreordenes'
import Swal from 'sweetalert2'

const PuntoVenta = () => {
  const [cart, setCart] = useState([])
  const [expandedCategories, setExpandedCategories] = useState({})
  const [metodoPago, setMetodoPago] = useState(null)
  const [idCliente, setIdCliente] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [preordenSeleccionada, setPreordenSeleccionada] = useState(null)
  const [preordenes, setPreordenes] = useState([])
  const [cargandoPreordenes, setCargandoPreordenes] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedProduct, setHighlightedProduct] = useState(null)
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [tipoServicio, setTipoServicio] = useState('comer-aqui')
  const [tipoLeche, setTipoLeche] = useState('entera')
  const [comentarios, setComentarios] = useState('')

  const { productos, loading: productosLoading } = useProductos()
  const { crearVenta, obtenerInfoTicketActual, loading: ventaLoading } = useVentas()
  const { crearComanda, loading: comandaLoading } = useComandas()
  const { obtenerPreordenes, procesarPago, actualizarPreorden, loading: preordenesLoading } = usePreordenes()
  const [numeroTicket, setNumeroTicket] = useState(null)

  // Cargar número de ticket actual
  const cargarNumeroTicket = async () => {
    try {
      const info = await obtenerInfoTicketActual()
      if (info?.numero_ticket_actual) {
        setNumeroTicket(info.numero_ticket_actual)
      }
    } catch (error) {
      console.error('Error al cargar número de ticket:', error)
    }
  }

  // Cargar pre-órdenes pendientes
  useEffect(() => {
    const cargarPreordenes = async () => {
      try {
        setCargandoPreordenes(true)
        // Opción 1: Sin parámetro (backend retorna solo preorden y en_caja)
        const todasPreordenes = await obtenerPreordenes()
        
        // Opción 2: Filtro adicional en frontend como seguridad
        const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
          preorden.estado === 'preorden' || preorden.estado === 'en_caja'
        )
        
        setPreordenes(preordenesFiltradas)
      } catch (error) {
        console.error('Error al cargar pre-órdenes:', error)
      } finally {
        setCargandoPreordenes(false)
      }
    }
    cargarPreordenes()
    // Refrescar cada 10 segundos
    const interval = setInterval(cargarPreordenes, 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar número de ticket al montar el componente
  useEffect(() => {
    cargarNumeroTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id)
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const total = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)

  // Agrupar productos por categoría
  const categories = [...new Set(productos.map(p => p.categoria))]

  // Función helper para extraer mensaje de error
  const extraerMensajeError = (error, mensajeDefault = 'Error al procesar la operación') => {
    // Si hay respuesta del servidor
    if (error.response?.data) {
      // Error de FastAPI (validación) - puede ser string o array
      if (error.response.data.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          return detail
        } else if (Array.isArray(detail)) {
          // Si es un array de errores de validación
          return detail.map(err => err.msg || JSON.stringify(err)).join(', ')
        } else {
          return JSON.stringify(detail)
        }
      }
      // Error del repositorio
      if (error.response.data.error) {
        return error.response.data.error
      }
      // Otro formato de error
      if (typeof error.response.data === 'string') {
        return error.response.data
      }
      // Si es un objeto, convertirlo a string legible
      return JSON.stringify(error.response.data)
    }
    // Error de red o otro tipo
    if (error.message) {
      return error.message
    }
    return mensajeDefault
  }

  // Función para abrir modal de finalizar pedido
  const abrirModalFinalizar = () => {
    if (cart.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'El carrito está vacío',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (!metodoPago) {
      Swal.fire({
        icon: 'warning',
        title: 'Método de pago requerido',
        text: 'Por favor selecciona un método de pago',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setMostrarModalFinalizar(true)
  }

  // Función para procesar venta completa
  const procesarVenta = async () => {
    setProcesando(true)
    setMostrarModalFinalizar(false)
    try {
      // Calcular total con extra de leche deslactosada
      const extraLeche = tipoLeche === 'deslactosada' ? 15.00 : null
      const totalConExtra = total + (extraLeche || 0)

      // Crear detalles de venta (NO incluir el extra de leche como producto)
      const detallesVenta = cart.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.quantity,
        precio_unitario: parseFloat(item.precio),
        subtotal: parseFloat(item.precio) * item.quantity,
        observaciones: item.observaciones || null, // Observaciones del producto
      }))

      // Crear venta con los nuevos campos
      const ventaResponse = await crearVenta({
        id_cliente: idCliente,
        nombre_cliente: nombreCliente || null,
        total: totalConExtra,
        metodo_pago: metodoPago,
        tipo_servicio: tipoServicio,
        tipo_leche: tipoLeche,
        comentarios: comentarios || null,
        extra_leche: extraLeche,
        detalles: detallesVenta,
      })

      const idVenta = ventaResponse.id_venta

      // Crear detalles de comanda con observaciones
      const detallesComanda = cart.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.quantity,
        observaciones: item.observaciones || null,
      }))

      // Crear comanda (la información de tipo_servicio, tipo_leche, comentarios ya está en la venta)
      await crearComanda({
        id_venta: idVenta,
        estado: 'pendiente',
        detalles: detallesComanda,
      })

      // Limpiar carrito y resetear
      setCart([])
      setMetodoPago(null)
      setIdCliente(null)
      setNombreCliente('')
      setTipoServicio('comer-aqui')
      setTipoLeche('entera')
      setComentarios('')
      
      // Actualizar número de ticket después de crear la venta
      await cargarNumeroTicket()
      
      await Swal.fire({
        icon: 'success',
        title: '¡Venta procesada!',
        text: 'La venta se ha procesado correctamente',
        confirmButtonColor: '#10b981',
        timer: 2000,
      })
      
      // Notificar a otras pantallas (como Barista) que se procesó un pago
      window.dispatchEvent(new CustomEvent('pago-procesado'))
      
      // Recargar pre-órdenes (usando endpoint sin parámetros)
      const todasPreordenes = await obtenerPreordenes()
      const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
        preorden.estado === 'preorden' || preorden.estado === 'en_caja'
      )
      setPreordenes(preordenesFiltradas)
    } catch (error) {
      console.error('Error al procesar venta:', error)
      const errorMsg = extraerMensajeError(error, 'Error al procesar la venta')
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    } finally {
      setProcesando(false)
    }
  }

  // Función para procesar pago de pre-orden
  const procesarPagoPreorden = async () => {
    if (!preordenSeleccionada) return
    if (!metodoPago) {
      await Swal.fire({
        icon: 'warning',
        title: 'Método de pago requerido',
        text: 'Por favor selecciona un método de pago',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setProcesando(true)
    try {
      // Verificar y actualizar estado si es necesario
      // El backend requiere que la pre-orden esté en estado "en_caja"
      if (preordenSeleccionada.estado === 'preorden') {
        try {
          await actualizarPreorden(preordenSeleccionada.id_preorden, {
            estado: 'en_caja'
          })
          // Actualizar el estado local de la pre-orden seleccionada
          setPreordenSeleccionada({
            ...preordenSeleccionada,
            estado: 'en_caja'
          })
        } catch (error) {
          console.error('Error al actualizar estado de pre-orden:', error)
          const errorMsg = extraerMensajeError(error)
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Error al actualizar estado: ${errorMsg}`,
            confirmButtonColor: '#10b981',
          })
          return
        }
      }

      // Procesar el pago
      // Construir el payload: solo incluir id_cliente si tiene un valor válido
      const pagoData = {
        metodo_pago: metodoPago,
      }
      // Solo agregar id_cliente si tiene un valor válido (número)
      if (idCliente && !isNaN(Number(idCliente))) {
        pagoData.id_cliente = Number(idCliente)
      }
      
      const resultado = await procesarPago(preordenSeleccionada.id_preorden, pagoData)

      // Verificar respuesta exitosa
      if (resultado.message === "Pago procesado correctamente") {
        console.log('Pago procesado:', {
          id_venta: resultado.id_venta,
          id_comanda: resultado.id_comanda,
          estado_preorden: resultado.estado_preorden // Estado actualizado
        })

        await Swal.fire({
          icon: 'success',
          title: '¡Pago procesado!',
          text: 'El pago se ha procesado correctamente. La orden ahora está disponible para el barista.',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
        
        // Notificar a otras pantallas (como Barista) que se procesó un pago
        window.dispatchEvent(new CustomEvent('pago-procesado'))
        
        // Limpiar selección
        setPreordenSeleccionada(null)
        setMetodoPago(null)
        setIdCliente(null)
        
        // Refrescar pre-órdenes (la orden pagada desaparecerá automáticamente)
        const todasPreordenes = await obtenerPreordenes()
        const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
          preorden.estado === 'preorden' || preorden.estado === 'en_caja'
        )
        setPreordenes(preordenesFiltradas)
      } else {
        throw new Error(resultado.error || 'Error inesperado al procesar el pago')
      }
    } catch (error) {
      console.error('Error al procesar pago:', error)
      const errorMsg = extraerMensajeError(error, 'Error al procesar el pago')
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    } finally {
      setProcesando(false)
    }
  }

  // Función para seleccionar pre-orden
  const seleccionarPreorden = (preorden) => {
    setPreordenSeleccionada(preorden)
    setCart([]) // Limpiar carrito cuando se selecciona una pre-orden
  }

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

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  // Todas las categorías colapsadas por defecto
  const isCategoryExpanded = (category) => {
    return expandedCategories[category] === true
  }

  // Filtrar productos según búsqueda
  const productosFiltrados = productos.filter(producto => 
    producto.activo && (
      producto.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      producto.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  // Función para seleccionar producto desde búsqueda
  const seleccionarProductoDesdeBusqueda = (producto) => {
    // Expandir la categoría del producto
    setExpandedCategories(prev => ({
      ...prev,
      [producto.categoria]: true
    }))
    
    // Agregar al carrito
    addToCart({
      ...producto,
      id: producto.id_producto,
      name: producto.nombre,
      price: producto.precio,
    })
    
    // Limpiar búsqueda
    setSearchTerm('')
    
    // Destacar el producto temporalmente
    setHighlightedProduct(producto.id_producto)
    setTimeout(() => {
      setHighlightedProduct(null)
    }, 2000)
  }

  if (productosLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <p className="text-gray-600 mt-1">Gestiona las ventas de tu cafetería</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Productos */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buscador de productos */}
          <div className="card">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos por nombre, descripción o categoría..."
                className="input pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Resultados de búsqueda */}
            {searchTerm && productosFiltrados.length > 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''} encontrado{productosFiltrados.length !== 1 ? 's' : ''}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                  {productosFiltrados.map(producto => (
                    <button
                      key={producto.id_producto}
                      onClick={() => seleccionarProductoDesdeBusqueda(producto)}
                      className="p-3 border-2 border-matcha-300 rounded-lg hover:border-matcha-500 hover:bg-matcha-50 transition-all duration-200 text-left bg-matcha-50"
                    >
                      <p className="font-medium text-gray-900 text-sm">{producto.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">{producto.categoria}</p>
                      <p className="text-sm text-matcha-600 font-semibold mt-1">
                        ${parseFloat(producto.precio).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchTerm && productosFiltrados.length === 0 && (
              <div className="mt-4 border-t border-gray-200 pt-4 text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron productos</p>
              </div>
            )}
          </div>

          {/* Lista de categorías (solo mostrar si no hay búsqueda activa o si hay búsqueda pero no hay resultados) */}
          {(!searchTerm || productosFiltrados.length === 0) && categories.map(category => {
            const isExpanded = isCategoryExpanded(category)
            const categoryProducts = productos.filter(p => p.categoria === category && p.activo)
            
            return (
              <div key={category} className="card">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                >
                  <h2 className="text-lg font-semibold text-gray-900">
                    {category}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {categoryProducts.length} productos
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                    {categoryProducts.map(product => {
                      const isHighlighted = highlightedProduct === product.id_producto
                      return (
                        <button
                          key={product.id_producto}
                          onClick={() => addToCart({
                            ...product,
                            id: product.id_producto,
                            name: product.nombre,
                            price: product.precio,
                          })}
                          className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                            isHighlighted
                              ? 'border-matcha-500 bg-matcha-100 shadow-lg scale-105'
                              : 'border-gray-200 hover:border-matcha-500 hover:bg-matcha-50'
                          }`}
                        >
                          <p className="font-medium text-gray-900">{product.nombre}</p>
                          <p className="text-sm text-matcha-600 font-semibold mt-1">
                            ${parseFloat(product.precio).toFixed(2)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Carrito / Detalles de Pre-orden y Pre-órdenes */}
        <div className="lg:col-span-1 space-y-6">
          {/* Carrito / Detalles de Pre-orden */}
          <div className="card sticky top-24">
            {preordenSeleccionada ? (
              <>
                {/* Vista de Pre-orden Seleccionada */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pre-orden #{preordenSeleccionada.id_preorden}
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setPreordenSeleccionada(null)
                      setMetodoPago(null)
                    }}
                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Información del cliente */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-900">
                        {preordenSeleccionada.nombre_cliente}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatFecha(preordenSeleccionada.fecha_creacion)}
                    </p>
                  </div>

                  {/* Items de la pre-orden */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {preordenSeleccionada.detalles?.map((detalle, index) => {
                      const producto = productos.find(p => p.id_producto === detalle.id_producto)
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {producto?.nombre || `Producto #${detalle.id_producto}`}
                            </p>
                            {detalle.observaciones && (
                              <p className="text-xs text-gray-500 italic">
                                {detalle.observaciones}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              x{detalle.cantidad}
                            </p>
                            {producto && (
                              <p className="text-xs text-gray-500">
                                ${parseFloat(producto.precio).toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Total */}
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">
                        Total:
                      </span>
                      <span className="text-2xl font-bold text-matcha-600">
                        ${parseFloat(preordenSeleccionada.total || 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Método de pago */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setMetodoPago('efectivo')}
                        className={`w-full py-3 text-lg ${
                          metodoPago === 'efectivo'
                            ? 'btn-primary'
                            : 'btn-outline'
                        }`}
                      >
                        $ Efectivo
                      </button>
                      <button
                        onClick={() => setMetodoPago('tarjeta')}
                        className={`w-full py-3 text-lg ${
                          metodoPago === 'tarjeta'
                            ? 'btn-secondary'
                            : 'btn-outline'
                        }`}
                      >
                        Tarjeta
                      </button>
                    </div>

                    {/* Botón procesar pago */}
                    <button
                      onClick={procesarPagoPreorden}
                      disabled={procesando || preordenesLoading || !metodoPago}
                      className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {(procesando || preordenesLoading) && (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      )}
                      <CreditCard className="w-5 h-5" />
                      Procesar Pago
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Vista de Carrito Normal */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Orden Actual</h2>
                    {cart.length > 0 && (
                      <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </div>
                  {numeroTicket !== null && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Ticket #</span>
                      <span className="font-semibold text-matcha-600">{numeroTicket}</span>
                    </div>
                  )}
                </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>El carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">
                          {item.nombre || item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          ${parseFloat(item.precio || item.price).toFixed(2)} c/u
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-medium text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1 rounded hover:bg-red-100 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-matcha-600">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMetodoPago('efectivo')}
                      className={`w-full py-3 text-lg ${
                        metodoPago === 'efectivo'
                          ? 'btn-primary'
                          : 'btn-outline'
                      }`}
                    >
                      $ Efectivo
                    </button>
                    <button
                      onClick={() => setMetodoPago('tarjeta')}
                      className={`w-full py-3 text-lg ${
                        metodoPago === 'tarjeta'
                          ? 'btn-secondary'
                          : 'btn-outline'
                      }`}
                    >
                      Tarjeta
                    </button>
                  </div>
                  <button
                    onClick={abrirModalFinalizar}
                    disabled={procesando || ventaLoading || comandaLoading}
                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {(procesando || ventaLoading || comandaLoading) && (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    )}
                    Procesar Venta
                  </button>
                  <button
                    onClick={() => {
                      setCart([])
                      setMetodoPago(null)
                    }}
                    className="btn-outline w-full py-2"
                  >
                    Cancelar Orden
                  </button>
                </div>
              </>
            )}
              </>
            )}
          </div>

          {/* Pre-órdenes Pendientes */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-matcha-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pre-órdenes</h2>
              {preordenes.length > 0 && (
                <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                  {preordenes.length}
                </span>
              )}
            </div>

            {cargandoPreordenes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-matcha-600" />
              </div>
            ) : preordenes.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay pre-órdenes pendientes</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {preordenes.map((preorden) => {
                  const itemsCount = preorden.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
                  const isSelected = preordenSeleccionada?.id_preorden === preorden.id_preorden
                  return (
                    <button
                      key={preorden.id_preorden}
                      onClick={() => seleccionarPreorden(preorden)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? 'border-matcha-500 bg-matcha-50'
                          : 'border-gray-200 hover:border-matcha-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900 text-sm">
                            #{preorden.id_preorden}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatFecha(preorden.fecha_creacion)}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          preorden.estado === 'en_caja'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {preorden.estado === 'en_caja' ? 'En Caja' : 'Pre-orden'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="truncate">{preorden.nombre_cliente}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-matcha-600 text-sm">
                            ${parseFloat(preorden.total || 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">{itemsCount} items</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Finalizar Pedido */}
      {mostrarModalFinalizar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Finalizar Pedido</h2>
              <button
                onClick={() => setMostrarModalFinalizar(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-6">
              {/* Nombre del Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Cliente <span className="text-gray-400">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Tipo de Servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Servicio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTipoServicio('comer-aqui')}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      tipoServicio === 'comer-aqui'
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Comer Aquí
                  </button>
                  <button
                    onClick={() => setTipoServicio('para-llevar')}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      tipoServicio === 'para-llevar'
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Para Llevar
                  </button>
                </div>
              </div>

              {/* Tipo de Leche */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Leche
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTipoLeche('entera')}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      tipoLeche === 'entera'
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Entera
                  </button>
                  <button
                    onClick={() => setTipoLeche('deslactosada')}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      tipoLeche === 'deslactosada'
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    Deslactosada (+$15)
                  </button>
                </div>
              </div>

              {/* Comentarios */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comentarios <span className="text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  placeholder="Instrucciones especiales, sin azúcar, etc."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {tipoLeche === 'deslactosada' && (
                  <div className="flex items-center justify-between text-gray-600">
                    <span>Extra Leche Deslactosada:</span>
                    <span>+$15.00</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-matcha-600">
                    ${(total + (tipoLeche === 'deslactosada' ? 15 : 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setMostrarModalFinalizar(false)}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={procesarVenta}
                disabled={procesando || ventaLoading || comandaLoading}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(procesando || ventaLoading || comandaLoading) && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                Confirmar Pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PuntoVenta

