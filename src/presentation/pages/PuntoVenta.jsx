import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, Trash2, ShoppingCart, ArrowLeft, Loader2, Package, Clock, User, CreditCard, X, Search, Trash, Coins, Percent, CheckCircle } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { usePreordenes } from '../hooks/usePreordenes'
import { useAuth } from '../context/AuthContext'
import { useCaja } from '../hooks/useCaja'
import { imprimirTicket, itemsDesdeCarrito } from '../utils/imprimirTicket'
import { obtenerMetodosPagoActivos } from '../utils/metodosPagoConfig'
import { usePrinterContext } from '../context/PrinterContext'
import {
  EXTRAS_DISPONIBLES,
  LECHE_PRECIOS,
  PROTEINA_SCOOP_PRECIO,
  calcOpcionesItemTotal,
  calcPrecioExtras,
  calcPrecioLeche,
  buildItemObservaciones,
  calcPrecioOpcionesProducto,
  calcPrecioProteina,
  desglosarExtrasCarrito,
  getNombreExtra,
  getNombreProteina,
  parseObservacionesProducto,
  sortMenuCategories,
  tieneScoopProteina,
} from '../utils/productOptionsConfig'
import Swal from 'sweetalert2'

const PuntoVenta = () => {
  const navigate = useNavigate()
  const printer = usePrinterContext()
  const [cart, setCart] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null)
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
  const { crearVenta, obtenerInfoTicketActual, procesarPagoVenta, loading: ventaLoading } = useVentas()
  const { crearComanda, obtenerComandasTerminadasSinPagar, loading: comandaLoading } = useComandas()
  const { obtenerPreordenes, procesarPago, actualizarPreorden, cancelarPreorden, crearPreorden, obtenerPreorden, loading: preordenesLoading } = usePreordenes()
  const { usuario } = useAuth()
  const { estado: estadoCaja, loading: cajaLoading } = useCaja(15000)
  const [metodosPagoActivos, setMetodosPagoActivos] = useState(() => obtenerMetodosPagoActivos())
  const [numeroTicket, setNumeroTicket] = useState(null)
  const [mostrarModalCancelar, setMostrarModalCancelar] = useState(false)
  const [passwordCancelar, setPasswordCancelar] = useState('')
  const [preordenACancelar, setPreordenACancelar] = useState(null)
  
  // Estados para propina
  const [mostrarModalPropina, setMostrarModalPropina] = useState(false)
  const [propinaPorcentaje, setPropinaPorcentaje] = useState(null) // 10, 15, 20, 'personalizado'
  const [montoPropina, setMontoPropina] = useState(0)
  const [propinaPersonalizada, setPropinaPersonalizada] = useState('') // Para propina personalizada (monto o porcentaje)
  const [tipoPropinaPersonalizada, setTipoPropinaPersonalizada] = useState('porcentaje') // 'porcentaje' o 'monto'

  // Estados para descuento
  const [mostrarModalDescuento, setMostrarModalDescuento] = useState(false)
  const [descuentoTipo, setDescuentoTipo] = useState(null) // 'porcentaje' o 'monto'
  const [descuentoValor, setDescuentoValor] = useState(null) // número: % o monto $
  const [totalDescuento, setTotalDescuento] = useState(0) // monto en pesos a restar
  const [descuentoPersonalizado, setDescuentoPersonalizado] = useState('')
  const [tipoDescuentoPersonalizado, setTipoDescuentoPersonalizado] = useState('porcentaje')

  // Estado para enviar ticket por WhatsApp
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('')

  // Comandas terminadas sin pagar (para cobrar después)
  const [comandasTerminadasSinPagar, setComandasTerminadasSinPagar] = useState([])
  const [comandaTerminadaSeleccionada, setComandaTerminadaSeleccionada] = useState(null)

  // Estados para producto personalizado
  const [nombreProductoPersonalizado, setNombreProductoPersonalizado] = useState('')
  const [precioProductoPersonalizado, setPrecioProductoPersonalizado] = useState('')

  // Si la caja está cerrada, redirigir a abrir caja
  useEffect(() => {
    if (cajaLoading) return
    if (estadoCaja && estadoCaja.abierta === false) {
      navigate('/caja', { replace: true, state: { from: 'punto-venta', cajaCerrada: true } })
    }
  }, [cajaLoading, estadoCaja, navigate])

  // Escuchar cambios de métodos de pago desde Configuración
  useEffect(() => {
    const sync = () => {
      const activos = obtenerMetodosPagoActivos()
      setMetodosPagoActivos(activos)
      setMetodoPago((prev) => {
        if (!prev) return prev
        return activos.some((m) => m.id === prev) ? prev : null
      })
    }
    const onStorage = (e) => {
      if (e.key === 'zona2_metodos_pago') sync()
    }
    window.addEventListener('metodos-pago-config-changed', sync)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('metodos-pago-config-changed', sync)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

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

  // Cargar comandas terminadas sin pagar
  const cargarComandasTerminadasSinPagar = async () => {
    try {
      const data = await obtenerComandasTerminadasSinPagar()
      setComandasTerminadasSinPagar(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error al cargar comandas terminadas sin pagar:', error)
      setComandasTerminadasSinPagar([])
    }
  }
  useEffect(() => {
    cargarComandasTerminadasSinPagar()
    const interval = setInterval(cargarComandasTerminadasSinPagar, 5000)
    const handleComandaActualizada = () => cargarComandasTerminadasSinPagar()
    window.addEventListener('comanda-actualizada', handleComandaActualizada)
    return () => {
      clearInterval(interval)
      window.removeEventListener('comanda-actualizada', handleComandaActualizada)
    }
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
      const extrasNombres = extrasSeleccionados.map((id) => getNombreExtra(id))
      observaciones.push(`Extras: ${extrasNombres.join(', ')}`)
    }
    if (tipoProteinaSeleccionado) {
      observaciones.push('Scoop: Scoop de Proteína')
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
    
    // Si tiene opciones, abrir modal de selección
    const productId = product.id_producto
    if (productoExpandido === productId) {
      setProductoExpandido(null)
    } else {
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

  const cerrarModalOpcionesProducto = () => {
    if (productoExpandido) {
      setOpcionesProductos((prev) => ({
        ...prev,
        [productoExpandido]: {
          tipoLeche: 'entera',
          extras: [],
          tipoProteina: null,
        },
      }))
    }
    setProductoExpandido(null)
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
        extras: [],
        tipoProteina: null
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

  // Agrupar productos activos por categoría (orden del menú Zona 2)
  const categories = sortMenuCategories(
    [...new Set(productos.filter((p) => p.activo).map((p) => p.categoria))]
  )

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
          // Si es un array de errores de validación (FastAPI: loc, msg, type)
          return detail.map(err => {
            const field = Array.isArray(err.loc) ? err.loc.filter(l => l !== 'body').join('.') : ''
            const msg = err.msg || JSON.stringify(err)
            return field ? `${msg} (campo: ${field})` : msg
          }).join(', ')
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

  // Generar texto del ticket para WhatsApp
  const generarTextoTicket = () => {
    const { extraLeche: extraLecheTotal, extraExtras: extraExtrasTotal, extraProteina: extraProteinaTotal } =
      desglosarExtrasCarrito(cart)
    const totalConExtras = total + extraLecheTotal + extraExtrasTotal + extraProteinaTotal
    const totalDespuesDescuento = Math.max(0, totalConExtras - totalDescuento)
    const montoPropinaTicket = (propinaPorcentaje != null && typeof propinaPorcentaje === 'number')
      ? (totalDespuesDescuento * propinaPorcentaje) / 100
      : (propinaPorcentaje === 'personalizado' ? (montoPropina || 0) : 0)
    const totalFinal = totalDespuesDescuento + montoPropinaTicket

    let texto = '*Zona 2* - Ticket\n'
    texto += '━━━━━━━━━━━━━━━━\n\n'
    if (nombreCliente) texto += `Cliente: ${nombreCliente}\n\n`

    cart.forEach(item => {
      const nombre = item.nombre || item.name || item.nombre_producto || 'Producto'
      const cantidad = item.quantity || 1
      const precio = parseFloat(item.precio || item.price || 0)
      const subtotalItem = precio * cantidad
      texto += `${cantidad}x ${nombre}\n`
      texto += `   $${precio.toFixed(2)} c/u = $${subtotalItem.toFixed(2)}\n`
    })

    texto += '\n━━━━━━━━━━━━━━━━\n'
    texto += `Subtotal: $${total.toFixed(2)}\n`
    if (extraLecheTotal > 0) texto += `Extra Leche: +$${extraLecheTotal.toFixed(2)}\n`
    if (extraExtrasTotal > 0) texto += `Extras: +$${extraExtrasTotal.toFixed(2)}\n`
    if (extraProteinaTotal > 0) texto += `Proteína: +$${extraProteinaTotal.toFixed(2)}\n`
    if (totalDescuento > 0) {
      const descLabel = descuentoTipo === 'porcentaje' ? `Descuento (${descuentoValor}%)` : 'Descuento'
      texto += `${descLabel}: -$${totalDescuento.toFixed(2)}\n`
    }
    if (montoPropinaTicket > 0) {
      const propLabel = propinaPorcentaje === 'personalizado' ? 'Propina' : `Propina (${propinaPorcentaje}%)`
      texto += `${propLabel}: +$${Number(montoPropinaTicket).toFixed(2)}\n`
    }
    texto += `*Total: $${Number(totalFinal).toFixed(2)}*\n`
    texto += '\n━━━━━━━━━━━━━━━━\nGracias por tu compra'

    return texto
  }

  // Enviar ticket por WhatsApp
  const enviarTicketWhatsApp = () => {
    const numero = numeroWhatsApp.trim().replace(/\D/g, '')
    if (!numero || numero.length < 10) {
      Swal.fire({
        icon: 'warning',
        title: 'Número requerido',
        text: 'Por favor ingresa un número de WhatsApp válido (10 dígitos mínimo)',
        confirmButtonColor: '#10b981',
      })
      return
    }
    let numeroFormato = numero
    if (numero.length === 10 && !numero.startsWith('52')) {
      numeroFormato = '52' + numero
    } else if (numero.length === 12 && numero.startsWith('52')) {
      numeroFormato = numero
    } else if (numero.length > 10) {
      numeroFormato = numero.startsWith('+') ? numero.replace('+', '') : numero
    }
    const texto = generarTextoTicket()
    const url = `https://wa.me/${numeroFormato}?text=${encodeURIComponent(texto)}`
    window.open(url, '_blank')
    Swal.fire({
      icon: 'success',
      title: '¡Enviar ticket!',
      text: 'Se abrirá WhatsApp con el ticket. Completa el envío desde allí.',
      confirmButtonColor: '#10b981',
      timer: 2000,
    })
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

  const ofrecerImpresionTicket = async ({ titulo, texto, ticketData }) => {
    const ticketCompleto = {
      negocio: 'ZONA 2',
      lugar: 'Zona 2 Coffee Recovery',
      ...ticketData,
    }

    // Si la PT-210 está conectada, imprime directo por Bluetooth
    if (printer.isConnected) {
      try {
        await printer.printTicket(ticketCompleto)
        await Swal.fire({
          icon: 'success',
          title: titulo,
          text: 'Recibo enviado a la impresora térmica.',
          timer: 1800,
          showConfirmButton: false,
        })
        return
      } catch (err) {
        console.error('Error impresión térmica:', err)
        const retry = await Swal.fire({
          icon: 'warning',
          title: 'Error en impresora térmica',
          text: `${err.message || 'No se pudo imprimir'}. ¿Imprimir por el navegador?`,
          showCancelButton: true,
          confirmButtonText: 'Imprimir en navegador',
          cancelButtonText: 'Cerrar',
          confirmButtonColor: '#10b981',
        })
        if (retry.isConfirmed) {
          const printResult = imprimirTicket(ticketCompleto)
          if (printResult?.error) {
            await Swal.fire({
              icon: 'warning',
              title: 'No se pudo imprimir',
              text: printResult.error,
              confirmButtonColor: '#10b981',
            })
          }
        }
        return
      }
    }

    const result = await Swal.fire({
      icon: 'success',
      title: titulo,
      text: `${texto} (Conecta la PT-210 arriba para imprimir en térmica).`,
      showCancelButton: true,
      confirmButtonText: 'Imprimir ticket (Enter)',
      cancelButtonText: 'Cerrar (Esc)',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      focusConfirm: true,
      allowEnterKey: true,
      allowEscapeKey: true,
      keydownListenerCapture: true,
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton()
        const cancelBtn = Swal.getCancelButton()
        if (confirmBtn) confirmBtn.focus()
        const onKey = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            confirmBtn?.click()
          } else if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            cancelBtn?.click()
          }
        }
        document.addEventListener('keydown', onKey, true)
        Swal.getPopup()._onTicketKeys = onKey
      },
      willClose: () => {
        const popup = Swal.getPopup()
        if (popup?._onTicketKeys) {
          document.removeEventListener('keydown', popup._onTicketKeys, true)
        }
      },
    })
    if (result.isConfirmed) {
      const printResult = imprimirTicket(ticketCompleto)
      if (printResult?.error) {
        await Swal.fire({
          icon: 'warning',
          title: 'No se pudo imprimir',
          text: printResult.error,
          confirmButtonColor: '#10b981',
        })
      }
    }
  }

  const verificarCajaParaCobro = async () => {
    if (metodoPago === 'efectivo' && !estadoCaja?.abierta) {
      const result = await Swal.fire({
        title: 'Caja cerrada',
        text: 'No hay caja abierta. Debe abrir caja antes de cobrar en efectivo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir a Caja',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
      })
      if (result.isConfirmed) navigate('/caja')
      return false
    }
    if (metodoPago !== 'efectivo' && !estadoCaja?.abierta) {
      const continuar = await Swal.fire({
        title: 'Sin caja abierta',
        text: 'No hay caja abierta. La venta se registrará, pero se recomienda abrir caja.',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#10b981',
      })
      if (!continuar.isConfirmed) return false
    }
    return true
  }

  // Verificar si hay productos con leche en el carrito
  const tieneProductosConLeche = cart.some(item => {
    const idProducto = item.id_producto || item.id
    const producto = productos.find(p => p.id_producto === idProducto)
    return producto?.lleva_leche === true
  })

  // Función para procesar venta completa (o pago de comanda terminada si hay una seleccionada)
  const procesarVenta = async () => {
    const cajaOk = await verificarCajaParaCobro()
    if (!cajaOk) return

    setProcesando(true)
    setMostrarModalFinalizar(false)
    try {
      // Si es comanda lista para cobrar, solo procesar pago (no crear nueva venta) con propina, descuento y tipo servicio
      if (comandaTerminadaSeleccionada) {
        const bodyPago = {
          metodo_pago: metodoPago,
          tipo_servicio: tipoServicio || undefined,
          descuento_tipo: totalDescuento > 0 ? descuentoTipo : undefined,
          descuento_valor: totalDescuento > 0 ? descuentoValor : undefined,
          total_descuento: totalDescuento > 0 ? totalDescuento : undefined,
          propina_porcentaje: montoPropina > 0 && propinaPorcentaje != null ? propinaPorcentaje : undefined,
          propina_monto: montoPropina > 0 ? montoPropina : undefined,
        }
        const resultado = await procesarPagoVenta(comandaTerminadaSeleccionada.id_venta, bodyPago)
        if (resultado?.error) throw new Error(resultado.error)
        const subtotalTicket = Math.max(0, total + cart.reduce((sum, item) => sum + calcOpcionesItemTotal(item), 0) - totalDescuento)
        const ticketData = {
          numero: comandaTerminadaSeleccionada.numero_dia ?? comandaTerminadaSeleccionada.numero_pedido_dia ?? numeroTicket,
          cliente: nombreCliente || comandaTerminadaSeleccionada.nombre_cliente || null,
          tipoServicio: tipoServicio || null,
          metodoPago,
          cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
          items: itemsDesdeCarrito(cart),
          subtotal: subtotalTicket + totalDescuento,
          propina: montoPropina || 0,
          total: subtotalTicket + (montoPropina || 0),
        }
        await ofrecerImpresionTicket({
          titulo: '¡Pago procesado!',
          texto: 'La orden ha sido cobrada correctamente. ¿Deseas imprimir el ticket?',
          ticketData,
        })
        setComandaTerminadaSeleccionada(null)
        setCart([])
        setNombreCliente('')
        setTipoServicio('comer-aqui')
        setMetodoPago(null)
        setPropinaPorcentaje(null)
        setMontoPropina(0)
        removerDescuento()
        await cargarComandasTerminadasSinPagar()
        return
      }

      // Calcular total con extras basado en los items del carrito
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
      
      const totalConExtra = total + extraLeche + extraExtras + extraProteina
      const totalFinalVenta = Math.max(0, totalConExtra - totalDescuento)

      // Crear detalles de venta (NO incluir el extra de leche como producto)
      const detallesVenta = cart.map(item => {
        // Sanitizar id_producto: debe ser entero o null (para personalizados)
        const rawId = item.id_producto ?? item.id
        const idProducto = rawId != null && String(rawId).match(/^\d+$/) ? Number(rawId) : null
        const cantidad = Number(item.quantity) || 0
        const precioUnitario = parseFloat(String(item.precio).replace(/,/g, '')) || 0
        return {
          id_producto: idProducto,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal: precioUnitario * cantidad,
          nombre_producto: item.personalizado ? (item.nombre || item.nombre_producto) : (item.nombre || null),
          observaciones: item.observaciones || null, // Observaciones del producto
        }
      })

      // Crear venta con los nuevos campos
      // Nota: tipo_leche ya no se usa a nivel global, cada producto tiene su tipo en observaciones
      // El extra_leche se calcula de los items individuales del carrito
      const ventaResponse = await crearVenta({
        id_cliente: idCliente,
        nombre_cliente: nombreCliente || null,
        total: totalFinalVenta,
        metodo_pago: metodoPago,
        tipo_servicio: tipoServicio,
        tipo_leche: null,
        comentarios: comentarios || null,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        detalles: detallesVenta,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : null,
        descuento_valor: totalDescuento > 0 ? descuentoValor : null,
        total_descuento: totalDescuento > 0 ? totalDescuento : null,
      })
      if (ventaResponse?.error) {
        throw new Error(ventaResponse.error || 'Error al crear la venta')
      }
      const idVenta = ventaResponse.id_venta ?? ventaResponse.idVenta
      if (idVenta == null || idVenta === '') {
        throw new Error('No se recibió el ID de la venta. Reintenta o contacta soporte.')
      }

      // Crear detalles de comanda con observaciones y tipo de preparación
      const detallesComanda = cart.map(item => {
        const rawId = item.id_producto ?? item.id
        const idProducto = rawId != null && String(rawId).match(/^\d+$/) ? Number(rawId) : null
        const cantidad = Number(item.quantity) || 0
        return {
          id_producto: idProducto,
          cantidad,
          nombre_producto: item.personalizado ? (item.nombre || item.nombre_producto) : null,
          observaciones: item.observaciones || null,
          tipo_preparacion: item.tipoPreparacion || null, // Incluir tipo de preparación
        }
      })

      // Crear comanda (la información de tipo_servicio, tipo_leche, comentarios ya está en la venta)
      const comandaResponse = await crearComanda({
        id_venta: idVenta,
        estado: 'pendiente',
        detalles: detallesComanda,
      })

      // Registrar propina si existe
      if (propinaPorcentaje && montoPropina > 0 && comandaResponse?.id_comanda && usuario?.id_usuario) {
        try {
          const { propinasService } = await import('../../application/services/propinasService')
          await propinasService.registrarPropina({
            id_comanda: comandaResponse.id_comanda,
            monto_porcentaje: propinaPorcentaje,
            monto_dinero: montoPropina,
            metodo_pago: metodoPago,
            id_usuario: usuario.id_usuario
          })
        } catch (error) {
          console.error('Error al registrar propina:', error)
          // No bloquear el flujo si falla el registro de propina
        }
      }

      // Emitir evento para notificación de comanda creada
      if (comandaResponse?.id_comanda) {
        const numeroPedidoDia = ventaResponse?.numero_pedido_dia ?? ventaResponse?.numeroPedidoDia
        window.dispatchEvent(new CustomEvent('comanda-creada', {
          detail: {
            id_comanda: comandaResponse.id_comanda,
            id_venta: idVenta,
            ticket_id: numeroTicket,
            numero_pedido_dia: numeroPedidoDia ?? null,
          }
        }))
      }

      const ticketData = {
        numero: ventaResponse?.numero_pedido_dia ?? ventaResponse?.numeroPedidoDia ?? numeroTicket,
        cliente: nombreCliente || null,
        tipoServicio,
        metodoPago,
        cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
        comentarios: comentarios || null,
        items: itemsDesdeCarrito(cart),
        subtotal: totalConExtra,
        propina: montoPropina || 0,
        total: totalFinalVenta + (montoPropina || 0),
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
      removerDescuento()
      
      // Actualizar número de ticket después de crear la venta
      await cargarNumeroTicket()
      
      await ofrecerImpresionTicket({
        titulo: '¡Venta procesada!',
        texto: 'La venta se ha procesado correctamente. ¿Deseas imprimir el ticket?',
        ticketData,
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

  // Enviar orden a comandas sin pagar (para preparar primero, cobrar después)
  const enviarSinPagar = async () => {
    if (cart.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No hay productos para enviar',
        confirmButtonColor: '#10b981',
      })
      return
    }
    let nombreParaEnviar = (nombreCliente || '').trim()
    if (!nombreParaEnviar) {
      const { value } = await Swal.fire({
        icon: 'info',
        title: 'Nombre del cliente',
        input: 'text',
        inputPlaceholder: 'Nombre del cliente',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Enviar',
        confirmButtonColor: '#10b981',
        inputValidator: (value) => {
          if (!(value || '').trim()) return 'El nombre es requerido'
          return null
        },
      })
      if (value == null) return
      nombreParaEnviar = String(value).trim()
      setNombreCliente(nombreParaEnviar)
    }
    setProcesando(true)
    setMostrarModalFinalizar(false)
    try {
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
      const totalConExtra = total + extraLeche + extraExtras + extraProteina
      const totalFinalVenta = Math.max(0, totalConExtra - totalDescuento)

      const detallesVenta = cart.map(item => {
        const rawId = item.id_producto ?? item.id
        const idProducto = rawId != null && String(rawId).match(/^\d+$/) ? Number(rawId) : null
        const cantidad = Number(item.quantity) || 0
        const precioUnitario = parseFloat(String(item.precio).replace(/,/g, '')) || 0
        return {
          id_producto: idProducto,
          cantidad,
          precio_unitario: precioUnitario,
          subtotal: precioUnitario * cantidad,
          nombre_producto: item.personalizado ? (item.nombre || item.nombre_producto) : (item.nombre || null),
          observaciones: item.observaciones || null,
        }
      })

      const ventaResponse = await crearVenta({
        id_cliente: idCliente,
        nombre_cliente: nombreParaEnviar || nombreCliente || null,
        total: totalFinalVenta,
        metodo_pago: 'pendiente',
        tipo_servicio: tipoServicio,
        tipo_leche: null,
        comentarios: comentarios || null,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        detalles: detallesVenta,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : null,
        descuento_valor: totalDescuento > 0 ? descuentoValor : null,
        total_descuento: totalDescuento > 0 ? totalDescuento : null,
        pagada: false,
      })
      if (ventaResponse?.error) {
        throw new Error(ventaResponse.error || 'Error al crear la venta')
      }
      const idVenta = ventaResponse.id_venta ?? ventaResponse.idVenta
      if (idVenta == null || idVenta === '') {
        throw new Error('No se recibió el ID de la venta. Reintenta o contacta soporte.')
      }

      const detallesComanda = cart.map(item => {
        const rawId = item.id_producto ?? item.id
        const idProducto = rawId != null && String(rawId).match(/^\d+$/) ? Number(rawId) : null
        const cantidad = Number(item.quantity) || 0
        return {
          id_producto: idProducto,
          cantidad,
          nombre_producto: item.personalizado ? (item.nombre || item.nombre_producto) : null,
          observaciones: item.observaciones || null,
          tipo_preparacion: item.tipoPreparacion || null,
        }
      })

      const comandaResponse = await crearComanda({
        id_venta: idVenta,
        estado: 'pendiente',
        detalles: detallesComanda,
      })

      window.dispatchEvent(new CustomEvent('comanda-actualizada'))
      if (comandaResponse?.id_comanda) {
        const numeroPedidoDia = ventaResponse?.numero_pedido_dia ?? ventaResponse?.numeroPedidoDia
        window.dispatchEvent(new CustomEvent('comanda-creada', {
          detail: {
            id_comanda: comandaResponse.id_comanda,
            id_venta: idVenta,
            ticket_id: numeroTicket ?? null,
            numero_pedido_dia: numeroPedidoDia ?? null,
          },
        }))
      }
      setCart([])
      setNombreCliente('')
      setComentarios('')
      removerDescuento()
      await cargarComandasTerminadasSinPagar()

      await Swal.fire({
        icon: 'success',
        title: '¡Enviado a comandas!',
        text: 'La orden se envió sin pagar. Se preparará primero y podrás cobrar cuando esté lista.',
        confirmButtonColor: '#10b981',
        timer: 3000,
      })
    } catch (error) {
      console.error('Error al enviar sin pagar:', error)
      const errorMsg = extraerMensajeError(error, 'Error al enviar a comandas')
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

  // Procesar pago de comanda terminada sin pagar (con propina, descuento y tipo servicio si se indicaron)
  const procesarPagoComandaTerminada = async () => {
    if (!comandaTerminadaSeleccionada || !metodoPago) return
    const cajaOk = await verificarCajaParaCobro()
    if (!cajaOk) return
    setProcesando(true)
    try {
      const bodyPago = {
        metodo_pago: metodoPago,
        tipo_servicio: tipoServicio || undefined,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : undefined,
        descuento_valor: totalDescuento > 0 ? descuentoValor : undefined,
        total_descuento: totalDescuento > 0 ? totalDescuento : undefined,
        propina_porcentaje: montoPropina > 0 && propinaPorcentaje != null ? propinaPorcentaje : undefined,
        propina_monto: montoPropina > 0 ? montoPropina : undefined,
      }
      const resultado = await procesarPagoVenta(comandaTerminadaSeleccionada.id_venta, bodyPago)
      if (resultado?.error) throw new Error(resultado.error)
      const subtotalTicket = Math.max(0, total + cart.reduce((sum, item) => sum + calcOpcionesItemTotal(item), 0) - totalDescuento)
      const ticketData = {
        numero: comandaTerminadaSeleccionada.numero_dia ?? comandaTerminadaSeleccionada.numero_pedido_dia ?? numeroTicket,
        cliente: nombreCliente || comandaTerminadaSeleccionada.nombre_cliente || null,
        tipoServicio: tipoServicio || null,
        metodoPago,
        cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
        items: itemsDesdeCarrito(cart),
        subtotal: subtotalTicket + totalDescuento,
        propina: montoPropina || 0,
        total: subtotalTicket + (montoPropina || 0),
      }
      await ofrecerImpresionTicket({
        titulo: '¡Pago procesado!',
        texto: 'La orden ha sido cobrada correctamente. ¿Deseas imprimir el ticket?',
        ticketData,
      })
      setComandaTerminadaSeleccionada(null)
      setCart([])
      setNombreCliente('')
      setTipoServicio('comer-aqui')
      setMetodoPago(null)
      setPropinaPorcentaje(null)
      setMontoPropina(0)
      removerDescuento()
      await cargarComandasTerminadasSinPagar()
    } catch (error) {
      const errorMsg = extraerMensajeError(error, 'Error al procesar pago')
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
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
      
      // Crear detalles de la pre-orden desde el carrito
      const detalles = cart.map(item => ({
        id_producto: item.id_producto || item.originalId || item.id,
        cantidad: item.quantity,
        observaciones: buildItemObservaciones(item),
        tipo_preparacion: item.tipoPreparacion || null
      }))
      
      // Crear la pre-orden (se crea con estado 'preorden' por defecto)
      const preordenCreada = await crearPreorden({
        nombre_cliente: nombreCliente.trim(),
        tipo_servicio: tipoServicio,
        comentarios: comentarios || null,
        detalles: detalles,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        extra_extras: (extraExtras + extraProteina) > 0 ? (extraExtras + extraProteina) : null
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
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
      
      const detalles = cart.map(item => ({
        id_producto: item.id_producto || item.originalId || item.id,
        cantidad: item.quantity,
        observaciones: buildItemObservaciones(item),
        tipo_preparacion: item.tipoPreparacion || null
      }))
      
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
        extra_extras: (extraExtras + extraProteina) > 0 ? (extraExtras + extraProteina) : null
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
    if (cart.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No puedes procesar el pago sin productos en el carrito',
        confirmButtonColor: '#10b981',
      })
      return
    }

    const cajaOk = await verificarCajaParaCobro()
    if (!cajaOk) return

    setProcesando(true)
    try {
      // Sincronizar el carrito actual (incluyendo productos extras agregados) a la pre-orden
      // antes de procesar el pago, para que todos los productos se envíen a las comandas
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)

      const detallesParaPreorden = cart.map(item => ({
        id_producto: item.id_producto || item.originalId || item.id,
        cantidad: item.quantity,
        observaciones: buildItemObservaciones(item),
        tipo_preparacion: item.tipoPreparacion || null
      }))

      const preordenConCartActualizado = await actualizarPreorden(preordenSeleccionada.id_preorden, {
        nombre_cliente: nombreCliente || preordenSeleccionada.nombre_cliente,
        tipo_servicio: tipoServicio,
        comentarios: comentarios,
        detalles: detallesParaPreorden,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        extra_extras: (extraExtras + extraProteina) > 0 ? (extraExtras + extraProteina) : null,
        estado: 'en_caja'
      })

      if (preordenConCartActualizado?.error) {
        throw new Error(preordenConCartActualizado.error)
      }
      setPreordenSeleccionada(preordenConCartActualizado)

      // Procesar el pago (la pre-orden ya tiene los detalles actualizados del carrito incluyendo extras)
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
          const numeroPedidoDia = resultado.numero_pedido_dia ?? resultado.numeroPedidoDia
          window.dispatchEvent(new CustomEvent('comanda-creada', {
            detail: {
              id_comanda: resultado.id_comanda,
              id_venta: resultado.id_venta,
              ticket_id: resultado.ticket_id || preordenSeleccionada.ticket_id || null,
              numero_pedido_dia: numeroPedidoDia ?? null,
            }
          }))
        }

        const ticketData = {
          numero: numeroTicket,
          ticketId: resultado.ticket_id || preordenSeleccionada.ticket_id || null,
          cliente: nombreCliente || preordenSeleccionada.nombre_cliente || null,
          tipoServicio: tipoServicio || preordenSeleccionada.tipo_servicio || null,
          metodoPago,
          cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
          comentarios: comentarios || preordenSeleccionada.comentarios || null,
          items: itemsDesdeCarrito(cart),
          subtotal: calcularSubtotalConExtras(),
          propina: montoPropina || 0,
          total: calcularSubtotalConExtras() + (montoPropina || 0),
        }

        await ofrecerImpresionTicket({
          titulo: '¡Pago procesado!',
          texto: 'El pago se procesó correctamente. ¿Deseas imprimir el ticket?',
          ticketData,
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
    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
    return subtotal + extraLeche + extraExtras + extraProteina
  }

  // Función para manejar selección de propina
  const seleccionarPropina = (porcentaje) => {
    if (porcentaje === 'personalizado') {
      setPropinaPorcentaje('personalizado')
      // No cerramos el modal aquí, esperamos que el usuario ingrese el valor personalizado
      return
    }

    const subtotal = calcularSubtotalConExtras()
    const monto = (subtotal * porcentaje) / 100
    setPropinaPorcentaje(porcentaje)
    setMontoPropina(monto)
    setMostrarModalPropina(false)
  }

  // Función para calcular el monto de propina personalizada (para vista previa)
  const calcularMontoPropinaPersonalizada = () => {
    const subtotal = calcularSubtotalConExtras()
    const valor = parseFloat(propinaPersonalizada) || 0

    if (tipoPropinaPersonalizada === 'porcentaje') {
      return (subtotal * valor) / 100
    } else {
      return valor
    }
  }

  // Función para aplicar propina personalizada
  const aplicarPropinaPersonalizada = () => {
    const subtotal = calcularSubtotalConExtras()
    const valor = parseFloat(propinaPersonalizada)

    if (isNaN(valor) || valor < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Valor inválido',
        text: 'Por favor ingresa un valor válido',
        confirmButtonColor: '#10b981',
      })
      return
    }

    let monto = 0
    if (tipoPropinaPersonalizada === 'porcentaje') {
      if (valor > 100) {
        Swal.fire({
          icon: 'error',
          title: 'Porcentaje inválido',
          text: 'El porcentaje no puede ser mayor a 100%',
          confirmButtonColor: '#10b981',
        })
        return
      }
      monto = (subtotal * valor) / 100
    } else {
      monto = valor
    }

    setMontoPropina(monto)
    setPropinaPorcentaje('personalizado')
    setMostrarModalPropina(false)
  }

  // Función para agregar producto personalizado al carrito
  const agregarProductoPersonalizado = () => {
    const nombre = nombreProductoPersonalizado.trim()
    const precio = parseFloat(precioProductoPersonalizado)

    if (!nombre) {
      Swal.fire({
        icon: 'error',
        title: 'Nombre requerido',
        text: 'Por favor ingresa un nombre para el producto',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (isNaN(precio) || precio <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'Por favor ingresa un precio válido mayor a 0',
        confirmButtonColor: '#10b981',
      })
      return
    }

    // Crear producto personalizado
    const productoPersonalizado = {
      id: `personalizado-${Date.now()}`, // ID único temporal para UI
      id_producto: null, // Enviar null al backend para productos personalizados
      nombre: nombre,
      precio: precio,
      personalizado: true // Marca para identificar productos personalizados
    }

    // Agregar al carrito
    addToCart(productoPersonalizado)

    // Limpiar campos
    setNombreProductoPersonalizado('')
    setPrecioProductoPersonalizado('')
  }

  // Actualizar monto de propina cuando cambia el carrito o el porcentaje (solo si es porcentaje numérico, no personalizado)
  useEffect(() => {
    if (propinaPorcentaje != null && typeof propinaPorcentaje === 'number') {
      const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)
      const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
      const totalConExtras = subtotal + extraLeche + extraExtras + extraProteina
      const monto = (totalConExtras * propinaPorcentaje) / 100
      setMontoPropina(monto)
    }
  }, [cart, propinaPorcentaje])

  // Actualizar monto de descuento cuando cambia el carrito
  useEffect(() => {
    if (descuentoTipo && descuentoValor != null) {
      const totalBase = calcularSubtotalConExtras()
      if (descuentoTipo === 'porcentaje') {
        setTotalDescuento((totalBase * descuentoValor) / 100)
      } else {
        setTotalDescuento(Math.min(descuentoValor, totalBase))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, descuentoTipo, descuentoValor])

  // Función para remover propina
  const removerPropina = () => {
    setPropinaPorcentaje(null)
    setMontoPropina(0)
  }

  // Función para seleccionar descuento por porcentaje (5, 10, 15, 20)
  const seleccionarDescuento = (porcentaje) => {
    setDescuentoTipo('porcentaje')
    setDescuentoValor(porcentaje)
    const totalBase = calcularSubtotalConExtras()
    setTotalDescuento((totalBase * porcentaje) / 100)
    setMostrarModalDescuento(false)
  }

  // Función para aplicar descuento personalizado (porcentaje o monto)
  const aplicarDescuentoPersonalizado = () => {
    const valor = parseFloat(descuentoPersonalizado)
    if (isNaN(valor) || valor <= 0) return
    if (tipoDescuentoPersonalizado === 'porcentaje') {
      setDescuentoTipo('porcentaje')
      setDescuentoValor(valor)
      const totalBase = calcularSubtotalConExtras()
      setTotalDescuento(Math.min((totalBase * valor) / 100, totalBase))
    } else {
      setDescuentoTipo('monto')
      setDescuentoValor(valor)
      const totalBase = calcularSubtotalConExtras()
      setTotalDescuento(Math.min(valor, totalBase))
    }
    setDescuentoPersonalizado('')
    setMostrarModalDescuento(false)
  }

  // Función para remover descuento
  const removerDescuento = () => {
    setDescuentoTipo(null)
    setDescuentoValor(null)
    setTotalDescuento(0)
    setDescuentoPersonalizado('')
  }

  // Función para parsear observaciones y extraer tipo de leche, extras y tipo de proteína
  const parsearObservaciones = (observaciones) => parseObservacionesProducto(observaciones)

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
      
      const cartItem = {
        ...producto,
        id: uniqueId,
        originalId: producto.id_producto,
        nombre: producto.nombre,
        precio: parseFloat(producto.precio),
        tipoLeche: tipoLeche,
        extras: extras || [],
        tipoProteina: tipoProteina,
        tipoPreparacion: detalle.tipo_preparacion || tipoPreparacion || null,
        quantity: detalle.cantidad
      }
      cartItem.observaciones = buildItemObservaciones(cartItem)
      
      itemsCarrito.push(cartItem)
    })
    
    return itemsCarrito
  }

  // Convertir comanda terminada sin pagar a items del carrito (para mostrarlos en Orden actual con propina/descuento/modal)
  const convertirComandaTerminadaACarrito = (comanda) => {
    if (!comanda?.detalles?.length) return []
    const itemsCarrito = []
    comanda.detalles.forEach((detalle, idx) => {
      const producto = productos.find(p => p.id_producto === detalle.id_producto)
      const precio = detalle.precio_unitario != null ? parseFloat(detalle.precio_unitario) : (producto ? parseFloat(producto.precio) : 0)
      const nombre = detalle.producto_nombre || detalle.nombre_producto || (producto?.nombre) || 'Producto'
      const { tipoLeche, extras, tipoProteina, tipoPreparacion } = parsearObservaciones(detalle.observaciones || '')
      const tipoLecheHash = tipoLeche || 'none'
      const extrasHash = extras?.length ? extras.sort().join(',') : 'none'
      const tipoProteinaHash = tipoProteina || 'none'
      const uniqueId = `comanda-${comanda.id_comanda}-${detalle.id_producto ?? idx}-${tipoLecheHash}-${extrasHash}-${tipoProteinaHash}`
      const cartItem = {
        id: uniqueId,
        id_producto: detalle.id_producto,
        nombre,
        precio,
        quantity: detalle.cantidad,
        tipoLeche: tipoLeche || null,
        extras: extras || [],
        tipoProteina: tipoProteina || null,
        tipoPreparacion: detalle.tipo_preparacion || tipoPreparacion || null,
        fromComandaTerminada: true,
      }
      cartItem.observaciones = buildItemObservaciones(cartItem)
      itemsCarrito.push(cartItem)
    })
    return itemsCarrito
  }

  const seleccionarComandaTerminada = (comanda) => {
    if (!comanda) return
    const items = convertirComandaTerminadaACarrito(comanda)
    setCart(items)
    setNombreCliente(comanda.venta_nombre_cliente || '')
    setTipoServicio(comanda.venta_tipo_servicio === 'para-llevar' ? 'para-llevar' : 'comer-aqui')
    setComandaTerminadaSeleccionada(comanda)
    setPreordenSeleccionada(null)
    setMetodoPago(null)
    setPropinaPorcentaje(null)
    setMontoPropina(0)
    removerDescuento()
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

  const productosDeCategoria = (category) =>
    productos.filter((p) => p.categoria === category && p.activo)

  const abrirCategoria = (category) => {
    setCategoriaActiva(category)
    setProductoExpandido(null)
    setSearchTerm('')
  }

  const volverACategorias = () => {
    setCategoriaActiva(null)
    setProductoExpandido(null)
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
    const llevaLeche = Boolean(producto.lleva_leche === true || producto.lleva_leche === 1 || producto.lleva_leche === '1')
    const llevaExtras = Boolean(producto.lleva_extras === true || producto.lleva_extras === 1 || producto.lleva_extras === '1')
    const llevaProteina = Boolean(producto.lleva_proteina === true || producto.lleva_proteina === 1 || producto.lleva_proteina === '1' || producto.categoria === 'runner_proteina')

    if (!llevaLeche && !llevaExtras && !llevaProteina) {
      // Producto sin opciones: agregar directamente al carrito
      addToCart({
        ...producto,
        id: producto.id_producto,
        name: producto.nombre,
        price: producto.precio,
      })
      setSearchTerm('')
      return
    }

    // Producto con opciones: abrir modal
    setProductoExpandido(producto.id_producto)
    if (!opcionesProductos[producto.id_producto]) {
      setOpcionesProductos({
        ...opcionesProductos,
        [producto.id_producto]: {
          tipoLeche: 'entera',
          extras: [],
          tipoProteina: null,
        },
      })
    }
    setSearchTerm('')
    setHighlightedProduct(null)
  }

  if (productosLoading || cajaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
      </div>
    )
  }

  if (estadoCaja && estadoCaja.abierta === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-600" />
        <span className="ml-3 text-gray-600">Redirigiendo a abrir caja...</span>
      </div>
    )
  }


  const renderProductTile = (product) => {
    const isHighlighted = highlightedProduct === product.id_producto
    const isSelected = productoExpandido === product.id_producto

    return (
      <button
        key={product.id_producto}
        type="button"
        onClick={() => handleProductClick(product)}
        className={`rounded-xl border-2 transition-all p-3 text-left min-h-[88px] active:scale-[0.98] ${
          isHighlighted || isSelected
            ? 'border-matcha-500 bg-matcha-50'
            : 'border-gray-200 bg-white hover:border-matcha-400'
        }`}
      >
        <p className="font-medium text-gray-900 text-sm leading-snug">{product.nombre}</p>
        <p className="text-sm text-matcha-600 font-semibold mt-1">${parseFloat(product.precio).toFixed(2)}</p>
      </button>
    )
  }

  const productoOpcionesModal = productoExpandido
    ? productos.find((p) => p.id_producto === productoExpandido)
    : null
  const opcionesModal = productoExpandido
    ? (opcionesProductos[productoExpandido] || { tipoLeche: 'entera', extras: [], tipoProteina: null })
    : null
  const modalLlevaLeche = productoOpcionesModal
    ? Boolean(productoOpcionesModal.lleva_leche === true || productoOpcionesModal.lleva_leche === 1 || productoOpcionesModal.lleva_leche === '1')
    : false
  const modalLlevaExtras = productoOpcionesModal
    ? Boolean(productoOpcionesModal.lleva_extras === true || productoOpcionesModal.lleva_extras === 1 || productoOpcionesModal.lleva_extras === '1')
    : false
  const modalLlevaProteina = productoOpcionesModal
    ? Boolean(
        productoOpcionesModal.lleva_proteina === true ||
          productoOpcionesModal.lleva_proteina === 1 ||
          productoOpcionesModal.lleva_proteina === '1' ||
          productoOpcionesModal.categoria === 'runner_proteina'
      )
    : false

  return (
    <div className="h-full min-h-0 pt-3 px-2 pb-2 flex gap-2 overflow-hidden">
      {/* Catálogo */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* Barra superior compacta */}
        <div className="shrink-0 flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar..."
              className="input pl-8 w-full py-2.5 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value) setCategoriaActiva(null)
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
          <input
            type="text"
            value={nombreProductoPersonalizado}
            onChange={(e) => setNombreProductoPersonalizado(e.target.value)}
            placeholder="Producto personalizado"
            className="input py-2.5 text-sm flex-1 min-w-0"
            maxLength="100"
          />
          <div className="relative w-28 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
            <input
              type="number"
              value={precioProductoPersonalizado}
              onChange={(e) => setPrecioProductoPersonalizado(e.target.value)}
              placeholder="0"
              className="input w-full pl-6 py-2.5 text-sm"
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={agregarProductoPersonalizado}
            disabled={!nombreProductoPersonalizado.trim() || !precioProductoPersonalizado}
            className="btn-primary py-2.5 px-4 text-sm disabled:opacity-50 shrink-0 inline-flex items-center gap-1.5 min-h-[42px]"
            title="Agregar personalizado"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>

        {/* Área con scroll propio: categorías o productos */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain rounded-xl bg-white border border-gray-200 p-2">
          {searchTerm ? (
            productosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm">Sin resultados</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
                {productosFiltrados.map((product) => renderProductTile(product))}
              </div>
            )
          ) : !categoriaActiva ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2">
              {categories.map((category) => {
                const count = productosDeCategoria(category).length
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => abrirCategoria(category)}
                    className="aspect-square sm:aspect-[4/3] rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-matcha-500 hover:bg-matcha-50 active:scale-[0.98] transition-all p-3 flex flex-col items-center justify-center text-center"
                  >
                    <span className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">{category}</span>
                    <span className="text-xs text-gray-500 mt-1">{count} items</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-2 pt-1">
                {/* Casilla volver también en la grilla */}
                <button
                  type="button"
                  onClick={volverACategorias}
                  className="min-h-[88px] rounded-xl border-2 border-dashed border-gray-300 bg-white hover:bg-gray-50 p-3 flex flex-col items-center justify-center text-gray-600 text-sm font-medium"
                >
                  <ArrowLeft className="w-5 h-5 mb-1" />
                  Categorías
                </button>
                {productosDeCategoria(categoriaActiva).map((product) => renderProductTile(product))}
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Ticket / orden — scroll propio */}
        <div className="w-full max-w-[360px] sm:w-[340px] lg:w-[360px] shrink-0 min-h-0 flex flex-col overflow-y-auto overscroll-contain gap-2">
          {/* Carrito / Detalles de Pre-orden / Orden actual (incluye comanda lista para cobrar) */}
            <div className="card shrink-0 !p-3">
            {preordenSeleccionada ? (
              <>
                {/* Vista de Pre-orden Seleccionada - Editable */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-matcha-600" />
                      <h2 className="text-base font-semibold text-gray-900">
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
                        <button
                          onClick={() => setMostrarModalDescuento(true)}
                          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                            totalDescuento > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-600'
                          }`}
                          title={totalDescuento > 0 ? `Descuento ${descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + totalDescuento.toFixed(2)}` : 'Agregar descuento'}
                        >
                          <Percent className="w-6 h-6" />
                        </button>
                        {totalDescuento > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removerDescuento()
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                            title="Quitar descuento"
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
                        removerDescuento()
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
                <div className="mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-base font-semibold text-gray-900">Editar Pre-orden</h2>
                    {cart.length > 0 && (
                      <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                        {cart.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    )}
                  </div>
                </div>

                {cart.length === 0 ? (
                  <div className="text-center py-6 text-gray-400">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">El carrito está vacío</p>
                    <p className="text-xs mt-2">Agrega productos desde el menú</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2 mb-3">
                      {cart.map(item => {
                        const extrasNombres = item.extras?.map((id) => getNombreExtra(id)) || []
                        
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
                                    Scoop: {getNombreProteina(item.tipoProteina)}
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
                        const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
                        const totalConExtras = subtotal + extraLeche + extraExtras + extraProteina
                        const descuentoActual = totalDescuento
                        const totalDespuesDescuento = Math.max(0, totalConExtras - descuentoActual)
                        const montoPropinaActual = (propinaPorcentaje != null && typeof propinaPorcentaje === 'number')
                          ? (totalDespuesDescuento * propinaPorcentaje) / 100
                          : (propinaPorcentaje === 'personalizado' ? (montoPropina || 0) : 0)
                        const totalFinal = totalDespuesDescuento + montoPropinaActual
                        const propinaLabel = propinaPorcentaje === 'personalizado' ? 'Propina (personalizado)' : (typeof propinaPorcentaje === 'number' ? `Propina (${propinaPorcentaje}%)` : 'Propina')
                        
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
                            {descuentoActual > 0 && (
                              <div className="flex items-center justify-between text-amber-600">
                                <span>Descuento ({descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + descuentoActual.toFixed(2)}):</span>
                                <span>-${descuentoActual.toFixed(2)}</span>
                              </div>
                            )}
                            {montoPropinaActual > 0 && (
                              <div className="flex items-center justify-between text-gray-600">
                                <span>{propinaLabel}:</span>
                                <span>+${Number(montoPropinaActual).toFixed(2)}</span>
                              </div>
                            )}
                            <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                              <span>Total:</span>
                              <span className="text-matcha-600">
                                ${Number(totalFinal).toFixed(2)}
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
                      <div className={`grid gap-3 ${metodosPagoActivos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {metodosPagoActivos.map((metodo) => (
                          <button
                            key={metodo.id}
                            onClick={() => setMetodoPago(metodo.id)}
                            className={`w-full py-3 text-lg ${
                              metodoPago === metodo.id
                                ? metodo.id === 'efectivo'
                                  ? 'btn-primary'
                                  : 'btn-secondary'
                                : 'btn-outline'
                            }`}
                          >
                            {metodo.boton}
                          </button>
                        ))}
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
                {/* Vista de Carrito Normal (incluye comanda lista para cobrar) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-base font-semibold text-gray-900">
                      {comandaTerminadaSeleccionada ? 'Para cobrar' : 'Orden Actual'}
                    </h2>
                    {comandaTerminadaSeleccionada && (
                      <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">Sin pagar</span>
                    )}
                    {comandaTerminadaSeleccionada && (
                      <span className="bg-matcha-100 text-matcha-700 text-xs font-medium px-2 py-1 rounded-full">
                        {comandaTerminadaSeleccionada.numero_dia ?? comandaTerminadaSeleccionada.numero_pedido_dia ?? comandaTerminadaSeleccionada.id_comanda}
                      </span>
                    )}
                    </div>
                    <div className="flex items-center gap-1">
                    {comandaTerminadaSeleccionada && (
                      <button
                        onClick={() => {
                          setComandaTerminadaSeleccionada(null)
                          setCart([])
                          setNombreCliente('')
                          setTipoServicio('comer-aqui')
                          setMetodoPago(null)
                          removerPropina()
                          removerDescuento()
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-600 font-bold"
                        title="Quitar comanda"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
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
                      <button
                        onClick={() => setMostrarModalDescuento(true)}
                        className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                          totalDescuento > 0 ? 'text-amber-600 bg-amber-50' : 'text-gray-600'
                        }`}
                        title={totalDescuento > 0 ? `Descuento ${descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + totalDescuento.toFixed(2)}` : 'Agregar descuento'}
                      >
                        <Percent className="w-6 h-6" />
                      </button>
                      {totalDescuento > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removerDescuento()
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-100 transition-colors text-red-600"
                          title="Quitar descuento"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                </div>

            {cart.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">El carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-3">
                  {cart.map(item => {
                    const extrasNombres = item.extras?.map((id) => getNombreExtra(id)) || []
                    
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
                                {getNombreProteina(item.tipoProteina)}
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
                  {/* Calcular total con extras y propina */}
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.precio) * item.quantity), 0)
                    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
                    const totalConExtras = subtotal + extraLeche + extraExtras + extraProteina
                    const descuentoActual = totalDescuento
                    const totalDespuesDescuento = Math.max(0, totalConExtras - descuentoActual)
                    const montoPropinaActual = (propinaPorcentaje != null && typeof propinaPorcentaje === 'number')
                      ? (totalDespuesDescuento * propinaPorcentaje) / 100
                      : (propinaPorcentaje === 'personalizado' ? (montoPropina || 0) : 0)
                    const totalFinal = totalDespuesDescuento + montoPropinaActual
                    const propinaLabel = propinaPorcentaje === 'personalizado' ? 'Propina (personalizado)' : (typeof propinaPorcentaje === 'number' ? `Propina (${propinaPorcentaje}%)` : 'Propina')
                    
                    return (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          {extraLeche > 0 && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Extra Leche:</span>
                              <span>+${extraLeche.toFixed(2)}</span>
                            </div>
                          )}
                          {extraExtras > 0 && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Extras:</span>
                              <span>+${extraExtras.toFixed(2)}</span>
                            </div>
                          )}
                          {extraProteina > 0 && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Proteína:</span>
                              <span>+${extraProteina.toFixed(2)}</span>
                            </div>
                          )}
                          {descuentoActual > 0 && (
                            <div className="flex items-center justify-between text-sm text-amber-600">
                              <span>Descuento ({descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + descuentoActual.toFixed(2)}):</span>
                              <span>-${descuentoActual.toFixed(2)}</span>
                            </div>
                          )}
                          {montoPropinaActual > 0 && (
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>{propinaLabel}:</span>
                              <span>+${Number(montoPropinaActual).toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <span className="text-lg font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-2xl font-bold text-matcha-600">
                              ${Number(totalFinal).toFixed(2)}
                    </span>
                  </div>
                        </div>
                      </>
                    )
                  })()}

                  {!comandaTerminadaSeleccionada && (
                    <>
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

                  {/* Enviar sin pagar: preparar primero, cobrar cuando esté lista */}
                  <button
                    onClick={enviarSinPagar}
                    disabled={procesando || ventaLoading || comandaLoading}
                    className="w-full py-2.5 text-sm border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title="Enviar a cocina para preparar, cobrar cuando esté lista (se pedirá el nombre del cliente si no está)"
                  >
                    {(procesando || ventaLoading || comandaLoading) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Enviar a Comandas (Sin Pagar)
                  </button>
                    </>
                  )}

                  <div className={`grid gap-3 ${metodosPagoActivos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {metodosPagoActivos.map((metodo) => (
                      <button
                        key={metodo.id}
                        onClick={() => setMetodoPago(metodo.id)}
                        className={`w-full py-3 text-lg ${
                          metodoPago === metodo.id
                            ? metodo.id === 'efectivo'
                              ? 'btn-primary'
                              : 'btn-secondary'
                            : 'btn-outline'
                        }`}
                      >
                        {metodo.boton}
                      </button>
                    ))}
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

          {/* Comandas terminadas sin pagar */}
          {comandasTerminadasSinPagar.length > 0 && (
            <div className="card mb-2 !p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-semibold text-gray-900">Comandas listas sin pagar</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                  {comandasTerminadasSinPagar.length}
                </span>
              </div>
              <div className="space-y-2">
                {comandasTerminadasSinPagar.map((comanda) => {
                  const itemsCount = comanda.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
                  const isSelected = comandaTerminadaSeleccionada?.id_comanda === comanda.id_comanda
                  return (
                    <div
                      key={comanda.id_comanda}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300'
                      }`}
                    >
                      <button
                        onClick={() => {
                          if (isSelected) {
                            setComandaTerminadaSeleccionada(null)
                            setCart([])
                            setNombreCliente('')
                            setTipoServicio('comer-aqui')
                          } else {
                            seleccionarComandaTerminada(comanda)
                          }
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              {comanda.numero_dia ?? comanda.numero_pedido_dia ?? comanda.id_comanda} · {comanda.venta_nombre_cliente || 'Sin nombre'}
                            </p>
                            <p className="text-xs text-gray-500">{itemsCount} items</p>
                          </div>
                          <p className="font-bold text-amber-600">${parseFloat(comanda.total || 0).toFixed(2)}</p>
                        </div>
                        <span className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                          Sin pagar
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Pre-órdenes Pendientes */}
          <div className="card !p-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-matcha-600" />
              <h2 className="text-base font-semibold text-gray-900">Pre-órdenes</h2>
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
              <div className="space-y-2">
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

      {/* Modal opciones de producto (leche / extras / proteína) */}
      {productoOpcionesModal && opcionesModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={cerrarModalOpcionesProducto}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="min-w-0 pr-2">
                <h2 className="text-xl font-bold text-gray-900 truncate">{productoOpcionesModal.nombre}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Elige las opciones</p>
              </div>
              <button
                type="button"
                onClick={cerrarModalOpcionesProducto}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {modalLlevaLeche && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Tipo de leche</p>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { value: 'entera', label: 'Entera', extra: 0 },
                      { value: 'deslactosada', label: 'Deslactosada', extra: LECHE_PRECIOS.deslactosada },
                      { value: 'almendras', label: 'Almendras', extra: LECHE_PRECIOS.almendras },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => actualizarTipoLeche(productoOpcionesModal.id_producto, opt.value)}
                        className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-left text-base font-medium transition-all ${
                          opcionesModal.tipoLeche === opt.value
                            ? 'border-matcha-500 bg-matcha-50 text-matcha-800'
                            : 'border-gray-200 text-gray-800'
                        }`}
                      >
                        {opt.label}
                        {opt.extra > 0 ? ` (+$${opt.extra})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {modalLlevaExtras && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Extras</p>
                  <div className="grid grid-cols-1 gap-2">
                    {EXTRAS_DISPONIBLES.map((extra) => {
                      const activo = (opcionesModal.extras || []).includes(extra.id)
                      return (
                        <button
                          key={extra.id}
                          type="button"
                          onClick={() => toggleExtra(productoOpcionesModal.id_producto, extra.id)}
                          className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-left text-base font-medium transition-all ${
                            activo
                              ? 'border-matcha-500 bg-matcha-50 text-matcha-800'
                              : 'border-gray-200 text-gray-800'
                          }`}
                        >
                          {extra.label} (+${extra.precio})
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {modalLlevaProteina && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Proteína</p>
                  <button
                    type="button"
                    onClick={() =>
                      actualizarTipoProteina(
                        productoOpcionesModal.id_producto,
                        tieneScoopProteina(opcionesModal.tipoProteina) ? null : 'scoop'
                      )
                    }
                    className={`w-full min-h-[52px] px-4 py-3 rounded-xl border-2 text-left text-base font-medium transition-all ${
                      tieneScoopProteina(opcionesModal.tipoProteina)
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-800'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    Scoop proteína (+${PROTEINA_SCOOP_PRECIO})
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={cerrarModalOpcionesProducto}
                className="btn-outline flex-1 min-h-[48px] text-base"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmarAgregarAlCarrito(productoOpcionesModal)}
                className="btn-primary flex-1 min-h-[48px] text-base inline-flex items-center justify-center gap-2"
              >
                Agregar · ${calcPrecioOpcionesProducto(productoOpcionesModal.precio, opcionesModal).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Finalizar Pedido */}
      {mostrarModalFinalizar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setMostrarModalFinalizar(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
            <div className="p-6 space-y-4">
              {/* Nombre del Cliente */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-0 required">
                  Nombre del Cliente <span className="text-gray-400"></span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Pérez"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Enviar ticket por WhatsApp */}
              {/*
              <div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Número de WhatsApp"
                    value={numeroWhatsApp}
                    onChange={(e) => setNumeroWhatsApp(e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={enviarTicketWhatsApp}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar ticket
                  </button>
                </div>
              </div>
              */}

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
                {/* Calcular extras, descuento, propina y total final */}
                {(() => {
                  const { extraLeche: extraLecheTotal, extraExtras: extraExtrasTotal, extraProteina: extraProteinaTotal } =
                    desglosarExtrasCarrito(cart)
                  
                  const totalConExtras = total + extraLecheTotal + extraExtrasTotal + extraProteinaTotal
                  const totalDespuesDescuento = Math.max(0, totalConExtras - totalDescuento)
                  const montoPropinaResumen = (propinaPorcentaje != null && typeof propinaPorcentaje === 'number')
                    ? (totalDespuesDescuento * propinaPorcentaje) / 100
                    : (propinaPorcentaje === 'personalizado' ? (montoPropina || 0) : 0)
                  const totalFinalResumen = totalDespuesDescuento + montoPropinaResumen
                  const propinaLabelResumen = propinaPorcentaje === 'personalizado' ? 'Propina (personalizado)' : (typeof propinaPorcentaje === 'number' ? `Propina (${propinaPorcentaje}%)` : 'Propina')
                  
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
                      {extraProteinaTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Proteína:</span>
                          <span>+${extraProteinaTotal.toFixed(2)}</span>
                        </div>
                      )}
                      {totalDescuento > 0 && (
                        <div className="flex items-center justify-between text-amber-600">
                          <span>Descuento ({descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + totalDescuento.toFixed(2)}):</span>
                          <span>-${totalDescuento.toFixed(2)}</span>
                        </div>
                      )}
                      {montoPropinaResumen > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{propinaLabelResumen}:</span>
                          <span>+${Number(montoPropinaResumen).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span className="text-matcha-600">
                          ${Number(totalFinalResumen).toFixed(2)}
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
                disabled={procesando || ventaLoading || comandaLoading || !metodoPago}
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setMostrarModalGuardarPreorden(false)
            setNombreCliente('')
            setTipoServicio('comer-aqui')
            setComentarios('')
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
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
                {(() => {
                  const { extraLeche: extraLecheTotal, extraExtras: extraExtrasTotal, extraProteina: extraProteinaTotal } =
                    desglosarExtrasCarrito(cart)
                  
                  const totalConExtras = total + extraLecheTotal + extraExtrasTotal + extraProteinaTotal
                  
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
                      {extraProteinaTotal > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Proteína:</span>
                          <span>+${extraProteinaTotal.toFixed(2)}</span>
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
                disabled={procesando}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {procesando && (
                  <Loader2 className="w-5 h-5 animate-spin" />
                )}
                Guardar Pre-orden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Propina */}
      {mostrarModalPropina && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setMostrarModalPropina(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Seleccionar Propina</h2>
              <button
                onClick={() => setMostrarModalPropina(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona el porcentaje de propina que deseas agregar
              </p>
              
              {/* Opciones de propina predefinidas */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => seleccionarPropina(10)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    propinaPorcentaje === 10
                      ? 'border-matcha-500 bg-matcha-50'
                      : 'border-gray-200 hover:border-matcha-500 hover:bg-matcha-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">10%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 10) / 100).toFixed(2)}
                  </div>
                </button>
                <button
                  onClick={() => seleccionarPropina(15)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    propinaPorcentaje === 15
                      ? 'border-matcha-500 bg-matcha-50'
                      : 'border-gray-200 hover:border-matcha-500 hover:bg-matcha-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">15%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 15) / 100).toFixed(2)}
                  </div>
                </button>
                <button
                  onClick={() => seleccionarPropina(20)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    propinaPorcentaje === 20
                      ? 'border-matcha-500 bg-matcha-50'
                      : 'border-gray-200 hover:border-matcha-500 hover:bg-matcha-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">20%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    ${((calcularSubtotalConExtras() * 20) / 100).toFixed(2)}
                  </div>
                </button>
              </div>

              {/* Opción de propina personalizada */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  O especifica una propina personalizada:
                </p>

                <div className="space-y-3">
                  {/* Selector de tipo */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTipoPropinaPersonalizada('porcentaje')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                        tipoPropinaPersonalizada === 'porcentaje'
                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700'
                          : 'border-gray-200 hover:border-matcha-500'
                      }`}
                    >
                      Porcentaje (%)
                    </button>
                    <button
                      onClick={() => setTipoPropinaPersonalizada('monto')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                        tipoPropinaPersonalizada === 'monto'
                          ? 'border-matcha-500 bg-matcha-50 text-matcha-700'
                          : 'border-gray-200 hover:border-matcha-500'
                      }`}
                    >
                      Monto fijo ($)
                    </button>
                  </div>

                  {/* Input para valor personalizado */}
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={propinaPersonalizada}
                        onChange={(e) => setPropinaPersonalizada(e.target.value)}
                        placeholder={tipoPropinaPersonalizada === 'porcentaje' ? 'Ej: 12' : 'Ej: 25.00'}
                        className="input w-full pr-12"
                        min="0"
                        step={tipoPropinaPersonalizada === 'porcentaje' ? '1' : '0.01'}
                        max={tipoPropinaPersonalizada === 'porcentaje' ? '100' : undefined}
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        {tipoPropinaPersonalizada === 'porcentaje' ? '%' : '$'}
                      </span>
                    </div>
                    <button
                      onClick={aplicarPropinaPersonalizada}
                      disabled={!propinaPersonalizada || propinaPersonalizada === '0'}
                      className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>

                  
                </div>
              </div>
            </div>

            {/* Footer */}
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

      {/* Modal Descuento */}
      {mostrarModalDescuento && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setMostrarModalDescuento(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Aplicar Descuento</h2>
              <button
                onClick={() => setMostrarModalDescuento(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona un porcentaje o ingresa un monto fijo de descuento
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={() => seleccionarDescuento(5)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    descuentoTipo === 'porcentaje' && descuentoValor === 5
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">5%</div>
                </button>
                <button
                  onClick={() => seleccionarDescuento(10)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    descuentoTipo === 'porcentaje' && descuentoValor === 10
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">10%</div>
                </button>
                <button
                  onClick={() => seleccionarDescuento(15)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    descuentoTipo === 'porcentaje' && descuentoValor === 15
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">15%</div>
                </button>
                <button
                  onClick={() => seleccionarDescuento(20)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    descuentoTipo === 'porcentaje' && descuentoValor === 20
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-gray-200 hover:border-amber-500 hover:bg-amber-50'
                  }`}
                >
                  <div className="text-2xl font-bold text-gray-900">20%</div>
                </button>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">O especifica un descuento personalizado:</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipoDescuentoPersonalizado('porcentaje')}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                      tipoDescuentoPersonalizado === 'porcentaje'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-amber-500'
                    }`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    onClick={() => setTipoDescuentoPersonalizado('monto')}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                      tipoDescuentoPersonalizado === 'monto'
                        ? 'border-amber-500 bg-amber-50 text-amber-700'
                        : 'border-gray-200 hover:border-amber-500'
                    }`}
                  >
                    Monto fijo ($)
                  </button>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={descuentoPersonalizado}
                      onChange={(e) => setDescuentoPersonalizado(e.target.value)}
                      placeholder={tipoDescuentoPersonalizado === 'porcentaje' ? 'Ej: 12' : 'Ej: 50.00'}
                      className="input w-full pr-12"
                      min="0"
                      step={tipoDescuentoPersonalizado === 'porcentaje' ? '1' : '0.01'}
                      max={tipoDescuentoPersonalizado === 'porcentaje' ? '100' : undefined}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                      {tipoDescuentoPersonalizado === 'porcentaje' ? '%' : '$'}
                    </span>
                  </div>
                  <button
                    onClick={aplicarDescuentoPersonalizado}
                    disabled={!descuentoPersonalizado || descuentoPersonalizado === '0'}
                    className="btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setMostrarModalDescuento(false)}
                className="btn-outline w-full"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pre-orden */}
      {mostrarModalCancelar && preordenACancelar && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setMostrarModalCancelar(false)
            setPasswordCancelar('')
            setPreordenACancelar(null)
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-red-600">¿Cancelar Pre-orden?</h2>
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
                <div className="text-sm text-red-700 space-y-1">
                  <p><span className="font-medium">Pre-orden #:</span> {preordenACancelar.id_preorden}</p>
                  <p><span className="font-medium">Cliente:</span> {preordenACancelar.nombre_cliente || 'Sin nombre'}</p>
                  <p><span className="font-medium">Total:</span> ${parseFloat(preordenACancelar.total || 0).toFixed(2)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña de Administrador<span className="text-red-500">*</span>
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
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PuntoVenta


