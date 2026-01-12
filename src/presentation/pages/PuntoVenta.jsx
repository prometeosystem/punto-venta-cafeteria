import { useState, useEffect } from 'react'
import { Plus, Minus, Trash2, ShoppingCart, ChevronDown, ChevronUp, Loader2, Package, Clock, User, CreditCard, X, Search, Trash, Coins } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { usePreordenes } from '../hooks/usePreordenes'
import { useAuth } from '../context/AuthContext'
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
  const [mostrarModalGuardarPreorden, setMostrarModalGuardarPreorden] = useState(false)
  const [nombreCliente, setNombreCliente] = useState('')
  const [tipoServicio, setTipoServicio] = useState('comer-aqui')
  const [comentarios, setComentarios] = useState('')
  
  // Estados para opciones de producto desplegables
  const [productoExpandido, setProductoExpandido] = useState(null) // ID del producto expandido
  const [opcionesProductos, setOpcionesProductos] = useState({}) // { productId: { tipoLeche: 'entera', extras: [], tipoProteina: null } }

  const { productos, loading: productosLoading } = useProductos()
  const { crearVenta, obtenerInfoTicketActual, loading: ventaLoading } = useVentas()
  const { crearComanda, loading: comandaLoading } = useComandas()
  const { obtenerPreordenes, procesarPago, actualizarPreorden, cancelarPreorden, crearPreorden, obtenerPreorden, loading: preordenesLoading } = usePreordenes()
  const { usuario } = useAuth()
  const [numeroTicket, setNumeroTicket] = useState(null)
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false)
  const [passwordCancelar, setPasswordCancelar] = useState('')
  const [preordenACancelar, setPreordenACancelar] = useState(null)
  
  // Estados para propina
  const [mostrarModalPropina, setMostrarModalPropina] = useState(false)
  const [propinaPorcentaje, setPropinaPorcentaje] = useState(null) // 10, 15, 20
  const [montoPropina, setMontoPropina] = useState(0)

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
        // Incluir pre-órdenes con estado 'pagada' y origen 'sistema' para permitir edición
        const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
          preorden.estado === 'preorden' || preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')
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

  const addToCart = (product, tipoLecheSeleccionado = null, extrasSeleccionados = [], tipoProteinaSeleccionado = null) => {
    // Crear un ID único que incluya tipo de leche, extras y tipo de proteína para diferenciar productos
    const tipoLecheHash = tipoLecheSeleccionado || 'none'
    const extrasHash = extrasSeleccionados && extrasSeleccionados.length > 0 
      ? extrasSeleccionados.sort().join(',') 
      : 'none'
    const tipoProteinaHash = tipoProteinaSeleccionado || 'none'
    const uniqueId = `${product.id}-${tipoLecheHash}-${extrasHash}-${tipoProteinaHash}`
    
    // Construir observaciones basadas en tipo de leche, extras y tipo de proteína
    const observaciones = []
    if (tipoLecheSeleccionado && tipoLecheSeleccionado !== 'entera') {
      if (tipoLecheSeleccionado === 'deslactosada') {
        observaciones.push('Leche deslactosada')
      } else if (tipoLecheSeleccionado === 'almendras') {
        observaciones.push('Leche de almendras')
      }
    }
    if (extrasSeleccionados && extrasSeleccionados.length > 0) {
      const nombresExtras = {
        'tocino': 'Tocino',
        'huevo': 'Huevo',
        'jamon': 'Jamón',
        'chorizo': 'Chorizo'
      }
      const extrasNombres = extrasSeleccionados.map(id => nombresExtras[id] || id)
      observaciones.push(`Extras: ${extrasNombres.join(', ')}`)
    }
    if (tipoProteinaSeleccionado) {
      observaciones.push(`Scoop: ${tipoProteinaSeleccionado === 'proteina' ? 'Proteína' : 'Creatina'}`)
    }
    
    const cartItem = {
      ...product,
      id: uniqueId,
      originalId: product.id,
      tipoLeche: tipoLecheSeleccionado,
      extras: extrasSeleccionados || [],
      tipoProteina: tipoProteinaSeleccionado,
      observaciones: observaciones.length > 0 ? observaciones.join(' - ') : null,
      quantity: 1
    }
    
    const existingItem = cart.find(item => 
      item.originalId === product.id && 
      item.tipoLeche === tipoLecheSeleccionado &&
      JSON.stringify(item.extras?.sort() || []) === JSON.stringify((extrasSeleccionados || []).sort()) &&
      item.tipoProteina === tipoProteinaSeleccionado
    )
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === existingItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, cartItem])
    }
  }
  
  const handleProductClick = (product) => {
    const llevaLeche = Boolean(
      product.lleva_leche === true || 
      product.lleva_leche === 1 ||
      product.lleva_leche === "1"
    )
    
    const llevaExtras = Boolean(
      product.lleva_extras === true || 
      product.lleva_extras === 1 ||
      product.lleva_extras === "1"
    )
    
    const llevaProteina = Boolean(
      product.lleva_proteina === true || 
      product.lleva_proteina === 1 ||
      product.lleva_proteina === "1" ||
      product.categoria === 'runner_proteina'
    )
    
    // Si no tiene opciones, agregar directamente al carrito
    if (!llevaLeche && !llevaExtras && !llevaProteina) {
      addToCart({
        ...product,
        id: product.id_producto,
        name: product.nombre,
        price: product.precio,
      })
      return
    }
    
    // Si tiene opciones, expandir/colapsar el panel
    const productId = product.id_producto
    if (productoExpandido === productId) {
      // Si ya está expandido, colapsar
      setProductoExpandido(null)
    } else {
      // Expandir y inicializar opciones si no existen
      setProductoExpandido(productId)
      if (!opcionesProductos[productId]) {
        setOpcionesProductos({
          ...opcionesProductos,
          [productId]: {
            tipoLeche: 'entera',
            extras: [],
            tipoProteina: null
          }
        })
      }
    }
  }
  
  const confirmarAgregarAlCarrito = (product) => {
    const productId = product.id_producto
    const opciones = opcionesProductos[productId] || { tipoLeche: 'entera', extras: [], tipoProteina: null }
    
    const llevaLeche = Boolean(
      product.lleva_leche === true || 
      product.lleva_leche === 1 ||
      product.lleva_leche === "1"
    )
    
    const llevaExtras = Boolean(
      product.lleva_extras === true || 
      product.lleva_extras === 1 ||
      product.lleva_extras === "1"
    )
    
    const llevaProteina = Boolean(
      product.lleva_proteina === true || 
      product.lleva_proteina === 1 ||
      product.lleva_proteina === "1" ||
      product.categoria === 'runner_proteina'
    )
    
    addToCart(
      {
        ...product,
        id: product.id_producto,
        name: product.nombre,
        price: product.precio,
      },
      llevaLeche ? opciones.tipoLeche : null,
      llevaExtras ? opciones.extras : [],
      llevaProteina ? opciones.tipoProteina : null
    )
    
    // Colapsar el panel y resetear opciones
    setProductoExpandido(null)
    setOpcionesProductos({
      ...opcionesProductos,
      [productId]: {
        tipoLeche: 'entera',
        extras: []
      }
    })
  }
  
  const actualizarTipoLeche = (productId, tipoLeche) => {
    setOpcionesProductos({
      ...opcionesProductos,
      [productId]: {
        ...opcionesProductos[productId],
        tipoLeche
      }
    })
  }
  
  const actualizarTipoProteina = (productId, tipoProteina) => {
    setOpcionesProductos(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        tipoProteina: tipoProteina
      }
    }))
  }
  
  const toggleExtra = (productId, extraId) => {
    const opciones = opcionesProductos[productId] || { tipoLeche: 'entera', extras: [] }
    const extrasActuales = opciones.extras || []
    
    const nuevosExtras = extrasActuales.includes(extraId)
      ? extrasActuales.filter(id => id !== extraId)
      : [...extrasActuales, extraId]
    
    setOpcionesProductos({
      ...opcionesProductos,
      [productId]: {
        ...opciones,
        extras: nuevosExtras
      }
    })
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

  // Verificar si hay productos con leche en el carrito
  const tieneProductosConLeche = cart.some(item => {
    const idProducto = item.id_producto || item.id
    const producto = productos.find(p => p.id_producto === idProducto)
    return producto?.lleva_leche === true
  })

  // Función para procesar venta completa
  const procesarVenta = async () => {
    setProcesando(true)
    setMostrarModalFinalizar(false)
    try {
      // Calcular total con extras basado en los items del carrito
      const extraLeche = cart.reduce((sum, item) => {
        if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
          return sum + (15 * item.quantity)
        }
        return sum
      }, 0)
      
      const extraExtras = cart.reduce((sum, item) => {
        if (item.extras && item.extras.length > 0) {
          return sum + (item.extras.length * 20 * item.quantity)
        }
        return sum
      }, 0)
      
      const totalConExtra = total + extraLeche + extraExtras

      // Crear detalles de venta (NO incluir el extra de leche como producto)
      const detallesVenta = cart.map(item => ({
        id_producto: item.id_producto || item.id,
        cantidad: item.quantity,
        precio_unitario: parseFloat(item.precio),
        subtotal: parseFloat(item.precio) * item.quantity,
        observaciones: item.observaciones || null, // Observaciones del producto
      }))

      // Crear venta con los nuevos campos
      // Nota: tipo_leche ya no se usa a nivel global, cada producto tiene su tipo en observaciones
      // El extra_leche se calcula de los items individuales del carrito
      const ventaResponse = await crearVenta({
        id_cliente: idCliente,
        nombre_cliente: nombreCliente || null,
        total: totalConExtra,
        metodo_pago: metodoPago,
        tipo_servicio: tipoServicio,
        tipo_leche: null, // Ya no se usa tipo de leche global, cada producto tiene el suyo
        comentarios: comentarios || null,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        detalles: detallesVenta,
      })

      const idVenta = ventaResponse.id_venta

      // Crear detalles de comanda con observaciones y tipo de preparación
      const detallesComanda = cart.map(item => ({
        id_producto: item.id_producto || item.id,
        cantidad: item.quantity,
        observaciones: item.observaciones || null,
        tipo_preparacion: item.tipoPreparacion || null, // Incluir tipo de preparación
      }))

      // Crear comanda (la información de tipo_servicio, tipo_leche, comentarios ya está en la venta)
      const comandaResponse = await crearComanda({
        id_venta: idVenta,
        estado: 'pendiente',
        detalles: detallesComanda,
      })

      // Emitir evento para notificación de comanda creada
      if (comandaResponse?.id_comanda) {
        window.dispatchEvent(new CustomEvent('comanda-creada', {
          detail: {
            id_comanda: comandaResponse.id_comanda,
            id_venta: idVenta,
            ticket_id: numeroTicket
          }
        }))
      }

      // Limpiar carrito y resetear
      setCart([])
      setMetodoPago(null)
      setIdCliente(null)
      setNombreCliente('')
      setTipoServicio('comer-aqui')
      setComentarios('')
      setPropinaPorcentaje(null)
      setMontoPropina(0)
      
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
        preorden.estado === 'preorden' || preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')
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

  // Función para abrir modal de guardar como pre-orden
  const abrirModalGuardarPreorden = () => {
    if (cart.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No puedes guardar una pre-orden sin productos',
        confirmButtonColor: '#10b981',
      })
      return
    }
    setMostrarModalGuardarPreorden(true)
  }

  // Función para guardar orden normal como pre-orden
  const guardarComoPreorden = async () => {
    if (cart.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No puedes guardar una pre-orden sin productos',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (!nombreCliente || nombreCliente.trim() === '') {
      await Swal.fire({
        icon: 'warning',
        title: 'Nombre requerido',
        text: 'Por favor ingresa el nombre del cliente para crear la pre-orden',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setMostrarModalGuardarPreorden(false)
    setProcesando(true)
    try {
      // Calcular total con extras
      const extraLeche = cart.reduce((sum, item) => {
        if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
          return sum + (15 * item.quantity)
        }
        return sum
      }, 0)
      
      const extraExtras = cart.reduce((sum, item) => {
        if (item.extras && item.extras.length > 0) {
          return sum + (item.extras.length * 20 * item.quantity)
        }
        return sum
      }, 0)
      
      // Crear detalles de la pre-orden desde el carrito
      const detalles = cart.map(item => {
        const observaciones = []
        if (item.tipoLeche && item.tipoLeche !== 'entera') {
          if (item.tipoLeche === 'deslactosada') {
            observaciones.push('Leche deslactosada')
          } else if (item.tipoLeche === 'almendras') {
            observaciones.push('Leche de almendras')
          }
        }
        if (item.extras && item.extras.length > 0) {
          const nombresExtras = {
            'tocino': 'Tocino',
            'huevo': 'Huevo',
            'jamon': 'Jamón',
            'chorizo': 'Chorizo'
          }
          const extrasNombres = item.extras.map(id => nombresExtras[id] || id)
          observaciones.push(`Extras: ${extrasNombres.join(', ')}`)
        }
        if (item.tipoProteina) {
          observaciones.push(`Scoop: ${item.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}`)
        }
        
        return {
          id_producto: item.id_producto || item.originalId || item.id,
          cantidad: item.quantity,
          observaciones: observaciones.length > 0 ? observaciones.join(' - ') : null,
          tipo_preparacion: item.tipoPreparacion || null
        }
      })
      
      // Crear la pre-orden (se crea con estado 'preorden' por defecto)
      const preordenCreada = await crearPreorden({
        nombre_cliente: nombreCliente.trim(),
        tipo_servicio: tipoServicio,
        comentarios: comentarios || null,
        detalles: detalles,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        extra_extras: extraExtras > 0 ? extraExtras : null
      })
      
      if (preordenCreada?.error) {
        throw new Error(preordenCreada.error)
      }
      
      // Obtener la pre-orden completa con detalles
      let preordenCompleta = await obtenerPreorden(preordenCreada.id_preorden)
      
      // Actualizar el estado a 'en_caja' para que esté lista para editar/procesar
      const preordenActualizada = await actualizarPreorden(preordenCompleta.id_preorden, {
        estado: 'en_caja'
      })
      
      if (preordenActualizada?.error) {
        // Si falla la actualización, usar la pre-orden sin actualizar
        console.warn('No se pudo actualizar el estado a en_caja:', preordenActualizada.error)
      } else {
        // Usar la pre-orden actualizada
        preordenCompleta = preordenActualizada
      }
      
      // Seleccionar la pre-orden recién creada
      await seleccionarPreorden(preordenCompleta)
      
      // Actualizar la lista de pre-órdenes
      const todasPreordenes = await obtenerPreordenes()
      const preordenesFiltradas = (todasPreordenes || []).filter(p => 
        p.estado === 'preorden' || p.estado === 'en_caja' || (p.estado === 'pagada' && p.origen === 'sistema')
      )
      setPreordenes(preordenesFiltradas)
      
      // Limpiar campos después de guardar
      setNombreCliente('')
      setTipoServicio('comer-aqui')
      setComentarios('')
      
      await Swal.fire({
        icon: 'success',
        title: 'Pre-orden creada',
        text: 'La orden se ha guardado como pre-orden correctamente',
        confirmButtonColor: '#10b981',
        timer: 2000,
      })
    } catch (error) {
      console.error('Error al guardar como pre-orden:', error)
      const errorMsg = extraerMensajeError(error, 'Error al guardar la pre-orden')
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

  // Función para guardar cambios en la pre-orden
  const guardarCambiosPreorden = async () => {
    if (!preordenSeleccionada) return
    
    if (cart.length === 0) {
      await Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No puedes guardar una pre-orden sin productos',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setProcesando(true)
    try {
      // Calcular total con extras
      const extraLeche = cart.reduce((sum, item) => {
        if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
          return sum + (15 * item.quantity)
        }
        return sum
      }, 0)
      
      const extraExtras = cart.reduce((sum, item) => {
        if (item.extras && item.extras.length > 0) {
          return sum + (item.extras.length * 20 * item.quantity)
        }
        return sum
      }, 0)
      
      // Crear detalles de la pre-orden desde el carrito
      const detalles = cart.map(item => {
        const observaciones = []
        if (item.tipoLeche && item.tipoLeche !== 'entera') {
          if (item.tipoLeche === 'deslactosada') {
            observaciones.push('Leche deslactosada')
          } else if (item.tipoLeche === 'almendras') {
            observaciones.push('Leche de almendras')
          }
        }
        if (item.extras && item.extras.length > 0) {
          const nombresExtras = {
            'tocino': 'Tocino',
            'huevo': 'Huevo',
            'jamon': 'Jamón',
            'chorizo': 'Chorizo'
          }
          const extrasNombres = item.extras.map(id => nombresExtras[id] || id)
          observaciones.push(`Extras: ${extrasNombres.join(', ')}`)
        }
        if (item.tipoProteina) {
          observaciones.push(`Scoop: ${item.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}`)
        }
        
        return {
          id_producto: item.id_producto || item.originalId || item.id,
          cantidad: item.quantity,
          observaciones: observaciones.length > 0 ? observaciones.join(' - ') : null,
          tipo_preparacion: item.tipoPreparacion || null // Incluir tipo de preparación del item
        }
      })
      
      // Si es una orden del sistema (pagada con origen sistema), convertirla en pre-orden
      // cambiando el estado a 'en_caja' y el origen a 'web'
      const esOrdenDelSistema = preordenSeleccionada.estado === 'pagada' && preordenSeleccionada.origen === 'sistema'
      
      // Preparar datos de actualización
      const datosActualizacion = {
        nombre_cliente: nombreCliente || preordenSeleccionada.nombre_cliente,
        tipo_servicio: tipoServicio,
        comentarios: comentarios,
        detalles: detalles,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        extra_extras: extraExtras > 0 ? extraExtras : null
      }
      
      // Si es orden del sistema, convertirla en pre-orden
      if (esOrdenDelSistema) {
        datosActualizacion.estado = 'en_caja'
        datosActualizacion.origen = 'web'
      }
      
      // Actualizar la pre-orden
      const preordenActualizada = await actualizarPreorden(preordenSeleccionada.id_preorden, datosActualizacion)
      
      if (preordenActualizada?.error) {
        throw new Error(preordenActualizada.error)
      }
      
      // Actualizar la preorden seleccionada con los datos actualizados
      setPreordenSeleccionada(preordenActualizada)
      
      // Actualizar la lista de pre-órdenes
      const todasPreordenes = await obtenerPreordenes()
      const preordenesFiltradas = (todasPreordenes || []).filter(p => 
        p.estado === 'preorden' || p.estado === 'en_caja' || (p.estado === 'pagada' && p.origen === 'sistema')
      )
      setPreordenes(preordenesFiltradas)
      
      await Swal.fire({
        icon: 'success',
        title: 'Cambios guardados',
        text: 'La pre-orden se ha actualizado correctamente',
        confirmButtonColor: '#10b981',
        timer: 2000,
      })
    } catch (error) {
      console.error('Error al guardar cambios:', error)
      const errorMsg = extraerMensajeError(error, 'Error al guardar los cambios')
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
      Swal.fire({
        icon: 'warning',
        title: 'Método de pago requerido',
        text: 'Por favor selecciona un método de pago',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setProcesando(true)
    try {
      // Verificar que la pre-orden esté en estado "en_caja"
      if (preordenSeleccionada.estado !== 'en_caja') {
        try {
          const preordenActualizada = await actualizarPreorden(preordenSeleccionada.id_preorden, {
            estado: 'en_caja'
          })
          
          if (preordenActualizada?.error) {
            throw new Error(preordenActualizada.error)
          }
          
          setPreordenSeleccionada(preordenActualizada)
        } catch (error) {
          console.error('Error al actualizar estado de pre-orden:', error)
          const errorMsg = extraerMensajeError(error)
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: `Error al actualizar estado: ${errorMsg}`,
            confirmButtonColor: '#10b981',
          })
          setProcesando(false)
          return
        }
      }

      // Procesar el pago
      const pagoData = {
        metodo_pago: metodoPago,
      }
      if (idCliente && !isNaN(Number(idCliente))) {
        pagoData.id_cliente = Number(idCliente)
      }
      
      // Agregar datos de propina si existe
      if (propinaPorcentaje && montoPropina > 0) {
        pagoData.propina_porcentaje = propinaPorcentaje
        pagoData.propina_monto = montoPropina
      }
      
      const resultado = await procesarPago(preordenSeleccionada.id_preorden, pagoData)

      // Verificar respuesta exitosa
      if (resultado.message === "Pago procesado correctamente") {
        console.log('Pago procesado:', {
          id_venta: resultado.id_venta,
          id_comanda: resultado.id_comanda,
          estado_preorden: resultado.estado_preorden // Estado actualizado
        })

        // Emitir evento para notificación de comanda creada (si hay id_comanda)
        if (resultado.id_comanda) {
          window.dispatchEvent(new CustomEvent('comanda-creada', {
            detail: {
              id_comanda: resultado.id_comanda,
              id_venta: resultado.id_venta,
              ticket_id: resultado.ticket_id || preordenSeleccionada.ticket_id || null
            }
          }))
        }

        await Swal.fire({
          icon: 'success',
          title: '¡Pago procesado!',
          text: 'El pago se ha procesado correctamente. La orden ahora está disponible para el barista.',
          confirmButtonColor: '#10b981',
          timer: 2000,
        })
        
        // Notificar a otras pantallas (como Barista) que se procesó un pago
        window.dispatchEvent(new CustomEvent('pago-procesado'))
        
        // Limpiar selección y carrito
        setPreordenSeleccionada(null)
        setCart([])
        setMetodoPago(null)
        setIdCliente(null)
        setNombreCliente('')
        setTipoServicio('comer-aqui')
        setComentarios('')
        setPropinaPorcentaje(null)
        setMontoPropina(0)
        
        // Refrescar pre-órdenes (la orden pagada desaparecerá automáticamente)
        const todasPreordenes = await obtenerPreordenes()
        const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
          preorden.estado === 'preorden' || preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')
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

  // Función para calcular subtotal con extras (sin propina)
  const calcularSubtotalConExtras = () => {
    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)
    const extraLeche = cart.reduce((sum, item) => {
      if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
        return sum + (15 * item.quantity)
      }
      return sum
    }, 0)
    const extraExtras = cart.reduce((sum, item) => {
      if (item.extras && item.extras.length > 0) {
        return sum + (item.extras.length * 20 * item.quantity)
      }
      return sum
    }, 0)
    return subtotal + extraLeche + extraExtras
  }

  // Función para manejar selección de propina
  const seleccionarPropina = (porcentaje) => {
    const subtotal = calcularSubtotalConExtras()
    const monto = (subtotal * porcentaje) / 100
    setPropinaPorcentaje(porcentaje)
    setMontoPropina(monto)
    setMostrarModalPropina(false)
  }

  // Actualizar monto de propina cuando cambia el carrito o el porcentaje
  useEffect(() => {
    if (propinaPorcentaje) {
      const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)
      const extraLeche = cart.reduce((sum, item) => {
        if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
          return sum + (15 * item.quantity)
        }
        return sum
      }, 0)
      const extraExtras = cart.reduce((sum, item) => {
        if (item.extras && item.extras.length > 0) {
          return sum + (item.extras.length * 20 * item.quantity)
        }
        return sum
      }, 0)
      const totalConExtras = subtotal + extraLeche + extraExtras
      const monto = (totalConExtras * propinaPorcentaje) / 100
      setMontoPropina(monto)
    }
  }, [cart, propinaPorcentaje])

  // Función para remover propina
  const removerPropina = () => {
    setPropinaPorcentaje(null)
    setMontoPropina(0)
  }

  // Función para parsear observaciones y extraer tipo de leche, extras y tipo de proteína
  const parsearObservaciones = (observaciones) => {
    if (!observaciones) return { tipoLeche: null, extras: [], tipoProteina: null, tipoPreparacion: null }
    
    let tipoLeche = null
    const extras = []
    let tipoProteina = null
    let tipoPreparacion = null
    
    // Buscar tipo de preparación
    if (observaciones.includes('Preparación: Frío') || observaciones.includes('Preparación: Frio')) {
      tipoPreparacion = 'heladas'
    } else if (observaciones.includes('Preparación: Frapeadas')) {
      tipoPreparacion = 'frapeadas'
    }
    
    // Buscar tipo de leche
    if (observaciones.includes('Leche deslactosada') || observaciones.includes('deslactosada')) {
      tipoLeche = 'deslactosada'
    } else if (observaciones.includes('Leche de almendras') || observaciones.includes('almendras')) {
      tipoLeche = 'almendras'
    } else if (observaciones.includes('entera')) {
      tipoLeche = 'entera'
    }
    
    // Buscar extras
    const nombresExtras = {
      'Tocino': 'tocino',
      'tocino': 'tocino',
      'Huevo': 'huevo',
      'huevo': 'huevo',
      'Jamón': 'jamon',
      'jamón': 'jamon',
      'jamon': 'jamon',
      'Chorizo': 'chorizo',
      'chorizo': 'chorizo'
    }
    
    if (observaciones.includes('Extras:')) {
      const extrasPart = observaciones.split('Extras:')[1]
      if (extrasPart) {
        // Separar por coma o por guión (para manejar "Extras: Tocino - Scoop: Proteína")
        const extrasList = extrasPart.split(/[,-]/).map(e => e.trim())
        extrasList.forEach(extra => {
          // Si contiene "Scoop:", no es un extra, es tipo de proteína
          if (extra.includes('Scoop:')) return
          const extraId = nombresExtras[extra]
          if (extraId && !extras.includes(extraId)) {
            extras.push(extraId)
          }
        })
      }
    }
    
    // Buscar tipo de proteína
    if (observaciones.includes('Scoop:')) {
      const scoopPart = observaciones.split('Scoop:')[1]
      if (scoopPart) {
        const scoopType = scoopPart.split(/[-]/)[0].trim()
        if (scoopType.includes('Proteína') || scoopType.includes('Proteina')) {
          tipoProteina = 'proteina'
        } else if (scoopType.includes('Creatina')) {
          tipoProteina = 'creatina'
        }
      }
    }
    
    return { tipoLeche, extras, tipoProteina, tipoPreparacion }
  }

  // Función para convertir detalles de preorden a items del carrito
  const convertirDetallesACarrito = (detalles) => {
    const itemsCarrito = []
    
    detalles.forEach((detalle) => {
      const producto = productos.find(p => p.id_producto === detalle.id_producto)
      if (!producto) return
      
      // Parsear observaciones para extraer tipo de leche, extras, tipo de proteína y tipo de preparación
      const { tipoLeche, extras, tipoProteina, tipoPreparacion } = parsearObservaciones(detalle.observaciones)
      
      // Crear ID único (incluyendo tipoProteina)
      const tipoLecheHash = tipoLeche || 'none'
      const extrasHash = extras && extras.length > 0 
        ? extras.sort().join(',') 
        : 'none'
      const tipoProteinaHash = tipoProteina || 'none'
      const uniqueId = `${producto.id_producto}-${tipoLecheHash}-${extrasHash}-${tipoProteinaHash}`
      
      // Construir observaciones
      const observaciones = []
      if (tipoLeche && tipoLeche !== 'entera') {
        if (tipoLeche === 'deslactosada') {
          observaciones.push('Leche deslactosada')
        } else if (tipoLeche === 'almendras') {
          observaciones.push('Leche de almendras')
        }
      }
      if (extras && extras.length > 0) {
        const nombresExtras = {
          'tocino': 'Tocino',
          'huevo': 'Huevo',
          'jamon': 'Jamón',
          'chorizo': 'Chorizo'
        }
        const extrasNombres = extras.map(id => nombresExtras[id] || id)
        observaciones.push(`Extras: ${extrasNombres.join(', ')}`)
      }
      if (tipoProteina) {
        observaciones.push(`Scoop: ${tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}`)
      }
      
      // Crear item del carrito
      const cartItem = {
        ...producto,
        id: uniqueId,
        originalId: producto.id_producto,
        nombre: producto.nombre,
        precio: parseFloat(producto.precio),
        tipoLeche: tipoLeche,
        extras: extras || [],
        tipoProteina: tipoProteina, // Agregar tipo de proteína
        tipoPreparacion: detalle.tipo_preparacion || tipoPreparacion || null, // Agregar tipo de preparación (prioridad al detalle)
        observaciones: observaciones.length > 0 ? observaciones.join(' - ') : null,
        quantity: detalle.cantidad
      }
      
      itemsCarrito.push(cartItem)
    })
    
    return itemsCarrito
  }

  // Función para seleccionar pre-orden
  const seleccionarPreorden = async (preorden) => {
    // Si la pre-orden está en estado "preorden" o "pagada" (con origen sistema), actualizarla a "en_caja"
    // Esto permite editar órdenes creadas directamente en el sistema
    if (preorden.estado === 'preorden' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')) {
      try {
        // Actualizar el estado a "en_caja" en el backend
        const preordenActualizada = await actualizarPreorden(preorden.id_preorden, {
          estado: 'en_caja'
        })
        
        // Verificar si hubo error en la respuesta
        if (preordenActualizada?.error) {
          throw new Error(preordenActualizada.error)
        }
        
        // Usar la pre-orden actualizada
        preorden = preordenActualizada
        
        // Actualizar la lista de pre-órdenes para reflejar el cambio
        const todasPreordenes = await obtenerPreordenes()
        const preordenesFiltradas = (todasPreordenes || []).filter(p => 
          p.estado === 'preorden' || p.estado === 'en_caja' || (p.estado === 'pagada' && p.origen === 'sistema')
        )
        setPreordenes(preordenesFiltradas)
      } catch (error) {
        console.error('Error al actualizar estado de pre-orden:', error)
        const errorMsg = error.response?.data?.error || error.message || 'Error al actualizar estado'
        await Swal.fire({
          icon: 'warning',
          title: 'Aviso',
          text: `No se pudo actualizar el estado a "en caja": ${errorMsg}`,
          confirmButtonColor: '#10b981',
        })
      }
    }
    
    // Convertir detalles de preorden a items del carrito editable
    if (preorden.detalles && preorden.detalles.length > 0) {
      const itemsCarrito = convertirDetallesACarrito(preorden.detalles)
      setCart(itemsCarrito)
    } else {
      setCart([])
    }
    
    // Establecer información adicional de la preorden
    setNombreCliente(preorden.nombre_cliente || '')
    setTipoServicio(preorden.tipo_servicio || 'comer-aqui')
    setComentarios(preorden.comentarios || '')
    
    // Limpiar propina al seleccionar nueva pre-orden
    setPropinaPorcentaje(null)
    setMontoPropina(0)
    
    // Guardar referencia a la preorden seleccionada
    setPreordenSeleccionada(preorden)
  }

  // Función para abrir modal de cancelar pre-orden
  const abrirModalCancelar = (preorden) => {
    setPreordenACancelar(preorden)
    setPasswordCancelar('')
    setMostrarModalCancelar(true)
  }

  // Función para cancelar pre-orden
  const confirmarCancelarPreorden = async () => {
    if (!preordenACancelar) return
    
    if (!passwordCancelar) {
      await Swal.fire({
        icon: 'warning',
        title: 'Contraseña requerida',
        text: 'Por favor ingresa tu contraseña para confirmar',
        confirmButtonColor: '#10b981',
      })
      return
    }

    setProcesando(true)
    try {
      const resultado = await cancelarPreorden(preordenACancelar.id_preorden, passwordCancelar)
      
      if (resultado?.error) {
        throw new Error(resultado.error)
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Pre-orden cancelada',
        text: 'La pre-orden ha sido cancelada correctamente',
        confirmButtonColor: '#10b981',
        timer: 2000,
      })
      
      // Cerrar modal
      setMostrarModalCancelar(false)
      setPasswordCancelar('')
      setPreordenACancelar(null)
      
      // Si la pre-orden cancelada estaba seleccionada, limpiar selección
      if (preordenSeleccionada?.id_preorden === preordenACancelar.id_preorden) {
        setPreordenSeleccionada(null)
        setCart([])
        setMetodoPago(null)
        setPropinaPorcentaje(null)
        setMontoPropina(0)
      }
      
      // Refrescar pre-órdenes
      const todasPreordenes = await obtenerPreordenes()
      const preordenesFiltradas = (todasPreordenes || []).filter(preorden => 
        preorden.estado === 'preorden' || preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')
      )
      setPreordenes(preordenesFiltradas)
    } catch (error) {
      console.error('Error al cancelar pre-orden:', error)
      const errorMsg = extraerMensajeError(error, 'Error al cancelar la pre-orden')
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

  // Verificar si el usuario es admin o superadmin
  const esAdmin = usuario?.rol === 'administrador' || usuario?.rol === 'superadministrador'

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
    
    // Manejar click en producto desde búsqueda
    handleProductClick(producto)
    
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
                      const isExpanded = productoExpandido === product.id_producto
                      const llevaLeche = Boolean(
                        product.lleva_leche === true || 
                        product.lleva_leche === 1 ||
                        product.lleva_leche === "1"
                      )
                      const llevaExtras = Boolean(
                        product.lleva_extras === true || 
                        product.lleva_extras === 1 ||
                        product.lleva_extras === "1"
                      )
                      const llevaProteina = Boolean(
                        product.lleva_proteina === true || 
                        product.lleva_proteina === 1 ||
                        product.lleva_proteina === "1" ||
                        product.categoria === 'runner_proteina'
                      )
                      const opciones = opcionesProductos[product.id_producto] || { tipoLeche: 'entera', extras: [], tipoProteina: null }
                      
                      return (
                        <div
                          key={product.id_producto}
                          className={`border-2 rounded-lg transition-all duration-200 ${
                            isHighlighted
                              ? 'border-matcha-500 bg-matcha-100 shadow-lg scale-105'
                              : isExpanded
                              ? 'border-matcha-500 hover:border-matcha-500'
                              : 'border-gray-200 hover:border-matcha-500 hover:bg-matcha-50'
                          }`}
                        >
                          <button
                            onClick={() => handleProductClick(product)}
                            className="w-full p-4 text-left"
                          >
                            <p className="font-medium text-gray-900">{product.nombre}</p>
                            <p className="text-sm text-matcha-600 font-semibold mt-1">
                              ${parseFloat(product.precio).toFixed(2)}
                            </p>
                          </button>
                          
                          {/* Panel de opciones expandido */}
                          {isExpanded && (llevaLeche || llevaExtras || llevaProteina) && (
                            <div className="px-4 pb-4 space-y-4 border-t border-gray-200 mt-2 pt-4">
                              {/* Tipo de Leche */}
                              {llevaLeche && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Tipo de Leche
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => actualizarTipoLeche(product.id_producto, 'entera')}
                                      className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                        opciones.tipoLeche === 'entera'
                                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      Entera
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => actualizarTipoLeche(product.id_producto, 'deslactosada')}
                                      className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                        opciones.tipoLeche === 'deslactosada'
                                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      Deslac. (+$15)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => actualizarTipoLeche(product.id_producto, 'almendras')}
                                      className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                        opciones.tipoLeche === 'almendras'
                                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      Almend. (+$15)
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Extras */}
                              {llevaExtras && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Extras (+$20 c/u)
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {[
                                      { id: 'tocino', nombre: 'Tocino' },
                                      { id: 'huevo', nombre: 'Huevo' },
                                      { id: 'jamon', nombre: 'Jamón' },
                                      { id: 'chorizo', nombre: 'Chorizo' }
                                    ].map(extra => (
                                      <button
                                        key={extra.id}
                                        type="button"
                                        onClick={() => toggleExtra(product.id_producto, extra.id)}
                                        className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                          opciones.extras?.includes(extra.id)
                                            ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                      >
                                        {extra.nombre}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Tipo de Proteína/Creatina */}
                              {llevaProteina && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-2">
                                    Scoop
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    <button
                                      type="button"
                                      onClick={() => actualizarTipoProteina(product.id_producto, 'proteina')}
                                      className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                        opciones.tipoProteina === 'proteina'
                                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      Proteína
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => actualizarTipoProteina(product.id_producto, 'creatina')}
                                      className={`py-2 px-2 rounded border-2 transition-all text-xs ${
                                        opciones.tipoProteina === 'creatina'
                                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      Creatina
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Resumen visual de opciones seleccionadas */}
                              {(opciones.tipoLeche && opciones.tipoLeche !== 'entera') || opciones.tipoProteina || (opciones.extras && opciones.extras.length > 0) ? (
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                                  {/* Etiqueta de tipo de proteína */}
                                  {opciones.tipoProteina && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
                                      Scoop: {opciones.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}
                                    </span>
                                  )}
                                  {/* Etiqueta de tipo de leche */}
                                  {opciones.tipoLeche && opciones.tipoLeche !== 'entera' && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                      Leche: {opciones.tipoLeche === 'deslactosada' ? 'Deslactosada' : 'Almendras'}
                                    </span>
                                  )}
                                  {/* Etiquetas de extras */}
                                  {opciones.extras && opciones.extras.length > 0 && (
                                    <>
                                      {opciones.extras.map((extraId, index) => {
                                        const nombresExtras = {
                                          'tocino': 'Tocino',
                                          'huevo': 'Huevo',
                                          'jamon': 'Jamón',
                                          'chorizo': 'Chorizo'
                                        }
                                        return (
                                          <span 
                                            key={index}
                                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300"
                                          >
                                            {nombresExtras[extraId] || extraId}
                                          </span>
                                        )
                                      })}
                                    </>
                                  )}
                                </div>
                              ) : null}
                              
                              {/* Resumen y botón agregar */}
                              <div className="border-t border-gray-200 pt-3 space-y-2">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>Subtotal:</span>
                                  <span>${parseFloat(product.precio).toFixed(2)}</span>
                                </div>
                                {(opciones.tipoLeche === 'deslactosada' || opciones.tipoLeche === 'almendras') && (
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Extra Leche:</span>
                                    <span>+$15.00</span>
                                  </div>
                                )}
                                {opciones.tipoProteina && (
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Scoop: {opciones.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}</span>
                                    <span className="text-gray-500">-</span>
                                  </div>
                                )}
                                {opciones.extras && opciones.extras.length > 0 && (
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>Extras ({opciones.extras.length}):</span>
                                    <span>+${(opciones.extras.length * 20).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
                                  <span>Total:</span>
                                  <span className="text-matcha-600">
                                    ${(
                                      parseFloat(product.precio) +
                                      ((opciones.tipoLeche === 'deslactosada' || opciones.tipoLeche === 'almendras') ? 15 : 0) +
                                      ((opciones.extras?.length || 0) * 20)
                                    ).toFixed(2)}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => confirmarAgregarAlCarrito(product)}
                                  className="w-full btn-primary py-2 mt-2 text-sm"
                                >
                                  Agregar al Carrito
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
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
                {/* Vista de Pre-orden Seleccionada - Editable */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-matcha-600" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        Pre-orden #{preordenSeleccionada.id_preorden}
                      </h2>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setMostrarModalPropina(true)}
                          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                            propinaPorcentaje ? 'text-matcha-600 bg-matcha-50' : 'text-gray-600'
                          }`}
                          title={propinaPorcentaje ? `Propina ${propinaPorcentaje}%` : 'Agregar propina'}
                        >
                          <Coins className="w-6 h-6" />
                        </button>
                        {propinaPorcentaje && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removerPropina()
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                            title="Quitar propina"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPreordenSeleccionada(null)
                        setCart([])
                        setMetodoPago(null)
                        setNombreCliente('')
                        setTipoServicio('comer-aqui')
                        setComentarios('')
                        setPropinaPorcentaje(null)
                        setMontoPropina(0)
                      }}
                      className="p-1 rounded hover:bg-gray-100 transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2 text-sm text-blue-700">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{preordenSeleccionada.nombre_cliente || 'Sin nombre'}</span>
                      <span className="text-blue-500">•</span>
                      <span className="text-xs">{formatFecha(preordenSeleccionada.fecha_creacion)}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            
            {preordenSeleccionada ? (
              <>
                {/* Carrito Editable para Pre-orden */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Editar Pre-orden</h2>
                    {cart.length > 0 && (
                      <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>El carrito está vacío</p>
                    <p className="text-xs mt-2">Agrega productos desde el menú</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                      {cart.map(item => {
                        const nombresExtras = {
                          'tocino': 'Tocino',
                          'huevo': 'Huevo',
                          'jamon': 'Jamón',
                          'chorizo': 'Chorizo'
                        }
                        const extrasNombres = item.extras?.map(id => nombresExtras[id] || id) || []
                        
                        const getNombreTipoLeche = (tipo) => {
                          if (tipo === 'deslactosada') return 'Deslactosada'
                          if (tipo === 'almendras') return 'Almendras'
                          return null
                        }
                        const tipoLecheNombre = getNombreTipoLeche(item.tipoLeche)
                        
                        return (
                          <div
                            key={item.id}
                            className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {item.nombre || item.name}
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {/* Etiqueta de tipo de preparación (frío/frapeada) */}
                                {item.tipoPreparacion && (
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                    item.tipoPreparacion === 'heladas'
                                      ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                                      : 'bg-orange-100 text-orange-700 border-orange-300'
                                  }`}>
                                    {item.tipoPreparacion === 'heladas' ? 'Frío' : 'Frapeada'}
                                  </span>
                                )}
                                {item.tipoProteina && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
                                    Scoop: {item.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}
                                  </span>
                                )}
                                {tipoLecheNombre && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                    Leche: {tipoLecheNombre}
                                  </span>
                                )}
                                {extrasNombres.map((nombre, index) => (
                                  <span 
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300"
                                  >
                                    {nombre}
                                  </span>
                                ))}
                              </div>
                              <p className="text-sm text-gray-500 mt-2">
                                ${parseFloat(item.precio || item.price).toFixed(2)} c/u
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
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
                        )
                      })}
                    </div>

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                      {/* Calcular total con extras y propina */}
                      {(() => {
                        const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)
                        const extraLeche = cart.reduce((sum, item) => {
                          if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
                            return sum + (15 * item.quantity)
                          }
                          return sum
                        }, 0)
                        const extraExtras = cart.reduce((sum, item) => {
                          if (item.extras && item.extras.length > 0) {
                            return sum + (item.extras.length * 20 * item.quantity)
                          }
                          return sum
                        }, 0)
                        const totalConExtras = subtotal + extraLeche + extraExtras
                        // Calcular monto de propina actualizado si hay porcentaje
                        const montoPropinaActual = propinaPorcentaje ? (totalConExtras * propinaPorcentaje) / 100 : 0
                        const totalFinal = totalConExtras + montoPropinaActual
                        
                        return (
                          <>
                            <div className="flex items-center justify-between text-gray-600">
                              <span>Subtotal:</span>
                              <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {extraLeche > 0 && (
                              <div className="flex items-center justify-between text-gray-600">
                                <span>Extra Leche:</span>
                                <span>+${extraLeche.toFixed(2)}</span>
                              </div>
                            )}
                            {extraExtras > 0 && (
                              <div className="flex items-center justify-between text-gray-600">
                                <span>Extras:</span>
                                <span>+${extraExtras.toFixed(2)}</span>
                              </div>
                            )}
                            {montoPropinaActual > 0 && (
                              <div className="flex items-center justify-between text-gray-600">
                                <span>Propina ({propinaPorcentaje}%):</span>
                                <span>+${montoPropinaActual.toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                              <span>Total:</span>
                              <span className="text-matcha-600">
                                ${totalFinal.toFixed(2)}
                              </span>
                            </div>
                          </>
                        )
                      })()}

                      {/* Botón Guardar Cambios */}
                      <button
                        onClick={guardarCambiosPreorden}
                        disabled={procesando || preordenesLoading}
                        className="btn-outline w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {(procesando || preordenesLoading) && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Guardar Cambios
                      </button>

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
                  </>
                )}
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
                  {cart.map(item => {
                    // Obtener nombres de extras
                    const nombresExtras = {
                      'tocino': 'Tocino',
                      'huevo': 'Huevo',
                      'jamon': 'Jamón',
                      'chorizo': 'Chorizo'
                    }
                    const extrasNombres = item.extras?.map(id => nombresExtras[id] || id) || []
                    
                    // Obtener nombre del tipo de leche
                    const getNombreTipoLeche = (tipo) => {
                      if (tipo === 'deslactosada') return 'Deslactosada'
                      if (tipo === 'almendras') return 'Almendras'
                      return null
                    }
                    const tipoLecheNombre = getNombreTipoLeche(item.tipoLeche)
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {item.nombre || item.name}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {/* Etiqueta de tamaño si existe */}
                            {item.size && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-matcha-100 text-matcha-700 border border-matcha-300">
                                {item.size}
                              </span>
                            )}
                            {/* Etiqueta de tipo de preparación (frío/frapeada) */}
                            {item.tipoPreparacion && (
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                                item.tipoPreparacion === 'heladas'
                                  ? 'bg-cyan-100 text-cyan-700 border-cyan-300'
                                  : 'bg-orange-100 text-orange-700 border-orange-300'
                              }`}>
                                {item.tipoPreparacion === 'heladas' ? 'Frío' : 'Frapeada'}
                              </span>
                            )}
                            {/* Etiqueta de tipo de proteína */}
                            {item.tipoProteina && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-300">
                                Scoop: {item.tipoProteina === 'proteina' ? 'Proteína' : 'Creatina'}
                              </span>
                            )}
                            {/* Etiqueta de tipo de leche */}
                            {tipoLecheNombre && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                                Leche: {tipoLecheNombre}
                              </span>
                            )}
                            {/* Etiquetas de extras */}
                            {extrasNombres.map((nombre, index) => (
                              <span 
                                key={index}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-300"
                              >
                                {nombre}
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 mt-2">
                            ${parseFloat(item.precio || item.price).toFixed(2)} c/u
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
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
                    )
                  })}
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

                  {/* Botón Guardar como Pre-orden */}
                  <button
                    onClick={abrirModalGuardarPreorden}
                    disabled={procesando || preordenesLoading}
                    className="btn-outline w-full py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {(procesando || preordenesLoading) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Guardar como Pre-orden
                  </button>

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
                      setNombreCliente('')
                      setTipoServicio('comer-aqui')
                      setComentarios('')
                      setPropinaPorcentaje(null)
                      setMontoPropina(0)
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
                    <div
                      key={preorden.id_preorden}
                      className={`w-full p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-matcha-500 bg-matcha-50'
                          : 'border-gray-200 hover:border-matcha-300 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => seleccionarPreorden(preorden)}
                        className="w-full text-left"
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
                            preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema')
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {preorden.estado === 'en_caja' || (preorden.estado === 'pagada' && preorden.origen === 'sistema') ? 'En Caja' : 'Pre-orden'}
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
                      {/* Botón cancelar disponible para todos, pero requiere contraseña de admin/superadmin */}
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            abrirModalCancelar(preorden)
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash className="w-4 h-4" />
                          Cancelar Pre-orden
                        </button>
                      </div>
                    </div>
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
                {/* Calcular extra de leche basado en los items del carrito */}
                {(() => {
                  const extraLecheTotal = cart.reduce((sum, item) => {
                    if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
                      return sum + (15 * item.quantity)
                    }
                    return sum
                  }, 0)
                  
                  const extraExtrasTotal = cart.reduce((sum, item) => {
                    if (item.extras && item.extras.length > 0) {
                      return sum + (item.extras.length * 20 * item.quantity)
                    }
                    return sum
                  }, 0)
                  
                  const totalConExtras = total + extraLecheTotal + extraExtrasTotal
                  
                  return (
                    <>
                      {extraLecheTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extra Leche:</span>
                          <span>+${extraLecheTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {extraExtrasTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extras:</span>
                          <span>+${extraExtrasTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span className="text-matcha-600">
                          ${totalConExtras.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )
                })()}
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

      {/* Modal Guardar como Pre-orden */}
      {mostrarModalGuardarPreorden && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Guardar como Pre-orden</h2>
              <button
                onClick={() => {
                  setMostrarModalGuardarPreorden(false)
                  setNombreCliente('')
                  setTipoServicio('comer-aqui')
                  setComentarios('')
                }}
      {/* Modal Propina */}
      {mostrarModalPropina && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Seleccionar Propina</h2>
              <button
                onClick={() => setMostrarModalPropina(false)}
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
                  Nombre del Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="input w-full"
                  autoFocus
                />
              </div>

              {/* Tipo de Servicio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Servicio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
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
                    type="button"
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
                {/* Calcular extra de leche basado en los items del carrito */}
                {(() => {
                  const extraLecheTotal = cart.reduce((sum, item) => {
                    if (item.tipoLeche && (item.tipoLeche === 'deslactosada' || item.tipoLeche === 'almendras')) {
                      return sum + (15 * item.quantity)
                    }
                    return sum
                  }, 0)
                  
                  const extraExtrasTotal = cart.reduce((sum, item) => {
                    if (item.extras && item.extras.length > 0) {
                      return sum + (item.extras.length * 20 * item.quantity)
                    }
                    return sum
                  }, 0)
                  
                  const totalConExtras = total + extraLecheTotal + extraExtrasTotal
                  
                  return (
                    <>
                      {extraLecheTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extra Leche:</span>
                          <span>+${extraLecheTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {extraExtrasTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extras:</span>
                          <span>+${extraExtrasTotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span className="text-matcha-600">
                          ${totalConExtras.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )
                })()}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona el porcentaje de propina que deseas agregar
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => seleccionarPropina(10)}
                  className="py-4 px-4 rounded-lg border-2 border-gray-200 hover:border-matcha-500 hover:bg-matcha-50 transition-all text-center"
                >
                  <div className="text-2xl font-bold text-gray-900">10%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 10) / 100).toFixed(2)}
                  </div>
                </button>
                <button
                  onClick={() => seleccionarPropina(15)}
                  className="py-4 px-4 rounded-lg border-2 border-gray-200 hover:border-matcha-500 hover:bg-matcha-50 transition-all text-center"
                >
                  <div className="text-2xl font-bold text-gray-900">15%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 15) / 100).toFixed(2)}
                  </div>
                </button>
                <button
                  onClick={() => seleccionarPropina(20)}
                  className="py-4 px-4 rounded-lg border-2 border-gray-200 hover:border-matcha-500 hover:bg-matcha-50 transition-all text-center"
                >
                  <div className="text-2xl font-bold text-gray-900">20%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 20) / 100).toFixed(2)}
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalGuardarPreorden(false)
                  setNombreCliente('')
                  setTipoServicio('comer-aqui')
                  setComentarios('')
                }}
                className="btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={guardarComoPreorden}
                disabled={procesando || preordenesLoading || !nombreCliente || nombreCliente.trim() === ''}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(procesando || preordenesLoading) && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                Guardar Pre-orden
              </button>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setMostrarModalPropina(false)}
                className="btn-outline w-full"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pre-orden */}
      {mostrarModalCancelar && preordenACancelar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-red-600">Cancelar Pre-orden</h2>
              <button
                onClick={() => {
                  setMostrarModalCancelar(false)
                  setPasswordCancelar('')
                  setPreordenACancelar(null)
                }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">
                  ¿Estás seguro de que deseas cancelar esta pre-orden?
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p><span className="font-medium">Pre-orden #:</span> {preordenACancelar.id_preorden}</p>
                  <p><span className="font-medium">Cliente:</span> {preordenACancelar.nombre_cliente || 'Sin nombre'}</p>
                  <p><span className="font-medium">Total:</span> ${parseFloat(preordenACancelar.total || 0).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña de Administrador o Superadministrador <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="Ingresa la contraseña de un administrador"
                  value={passwordCancelar}
                  onChange={(e) => setPasswordCancelar(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      confirmarCancelarPreorden()
                    }
                  }}
                  className="input w-full"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se requiere la contraseña de un administrador o superadministrador para confirmar la cancelación
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setMostrarModalCancelar(false)
                  setPasswordCancelar('')
                  setPreordenACancelar(null)
                }}
                className="btn-outline flex-1"
                disabled={procesando}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarCancelarPreorden}
                disabled={procesando || !passwordCancelar}
                className="btn-primary flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesando && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PuntoVenta


