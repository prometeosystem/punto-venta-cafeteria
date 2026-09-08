import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Minus, Trash2, ShoppingCart, ArrowLeft, Loader2, X, Search, Coins, Percent, Check, CheckCircle, Receipt, ChefHat, Lock } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { useAuth } from '../context/AuthContext'
import { useCaja } from '../hooks/useCaja'
import { imprimirTicket, itemsDesdeCarrito } from '../utils/imprimirTicket'
import { obtenerMetodosPagoActivos } from '../utils/metodosPagoConfig'
import { isAdmin, puedeCobrar } from '../utils/rolePermissions'
import ModalAutorizacion from '../components/ModalAutorizacion'
import { usePrinterContext } from '../context/PrinterContext'
import {
  PROTEINA_SCOOP_PRECIO,
  buildItemObservaciones,
  calcPrecioOpcionesProducto,
  desglosarExtrasCarrito,
  getClavesDelGrupo,
  getExtrasDisponibles,
  getGruposDeProducto,
  getLechesDisponibles,
  getNombreExtra,
  getNombreProteina,
  hayAsignacionesCargadas,
  parseObservacionesProducto,
  productoLlevaLeche,
  productoLlevaProteina,
  sortMenuCategories,
  tieneScoopProteina,
} from '../utils/productOptionsConfig'
import { useOpcionesProducto } from '../hooks/useOpcionesProducto'
import Swal from 'sweetalert2'

/**
 * Qué opciones ofrece un producto. Manda la asignación de grupos; mientras no
 * se haya cargado se usan las banderas que trae el propio producto, que pueden
 * llegar como booleano, entero o cadena según el endpoint.
 */
const opcionesDelProducto = (product) => {
  if (!product) return { llevaLeche: false, llevaExtras: false, llevaProteina: false, grupos: [] }

  const bandera = (v) => v === true || v === 1 || v === '1'
  const id = product.id_producto

  if (hayAsignacionesCargadas()) {
    const grupos = getGruposDeProducto(id)
    return {
      llevaLeche: Boolean(productoLlevaLeche(id)),
      llevaProteina: Boolean(productoLlevaProteina(id)),
      llevaExtras: grupos.length > 0,
      grupos,
    }
  }

  return {
    llevaLeche: bandera(product.lleva_leche),
    llevaExtras: bandera(product.lleva_extras),
    llevaProteina: bandera(product.lleva_proteina) || product.categoria === 'runner_proteina',
    grupos: [],
  }
}

/**
 * Los modales se alinean arriba en lugar de al centro: en tablet el teclado
 * ocupa la mitad inferior de la pantalla y taparía uno centrado.
 */
const OVERLAY_MODAL =
  'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto'

/**
 * A partir de este porcentaje un descuento deja de ser cortesía y necesita
 * autorización. El backend valida lo mismo, esto solo evita el viaje en vano.
 */
const UMBRAL_DESCUENTO_AUTORIZACION = 15

/**
 * El método de pago es una selección, no la acción final. El verde sólido se
 * reserva para "Procesar Venta" y aquí se usa verde tenue, si no los dos
 * botones se ven iguales de un vistazo.
 */
const claseMetodoPago = (seleccionado) =>
  `w-full py-3 text-lg rounded-lg border-2 transition-colors ${
    seleccionado
      ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-semibold'
      : 'border-gray-200 bg-white text-gray-600 font-medium hover:border-gray-300 hover:bg-gray-50'
  }`

const PuntoVenta = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const printer = usePrinterContext()
  const panelOrdenRef = useRef(null)
  const [cart, setCart] = useState([])
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [metodoPago, setMetodoPago] = useState(null)
  const [idCliente, setIdCliente] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedProduct, setHighlightedProduct] = useState(null)
  const [mostrarModalFinalizar, setMostrarModalFinalizar] = useState(false)
  const [mostrarModalNombreCliente, setMostrarModalNombreCliente] = useState(false)
  const [nombreClienteTemp, setNombreClienteTemp] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [tipoServicio, setTipoServicio] = useState('comer-aqui')
  const [comentarios, setComentarios] = useState('')
  
  // Estados para opciones de producto desplegables
  const [productoExpandido, setProductoExpandido] = useState(null) // ID del producto expandido
  const [opcionesProductos, setOpcionesProductos] = useState({}) // { productId: { tipoLeche: 'entera', extras: [], tipoProteina: null } }

  const { productos, loading: productosLoading } = useProductos()
  // Deja el catálogo de extras y leches listo para los cálculos de precio
  useOpcionesProducto()
  const { crearVenta, obtenerInfoTicketActual, procesarPagoVenta, loading: ventaLoading } = useVentas()
  const { crearComanda, editarComanda, obtenerComanda, obtenerComandasTerminadasSinPagar, cancelarComanda, loading: comandaLoading } = useComandas()
  const { usuario } = useAuth()
  const { estado: estadoCaja, loading: cajaLoading } = useCaja(15000)
  const [metodosPagoActivos, setMetodosPagoActivos] = useState(() => obtenerMetodosPagoActivos())
  const [numeroTicket, setNumeroTicket] = useState(null)
  
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
  // Descuento esperando autorización: {tipo, valor}
  const [descuentoPendiente, setDescuentoPendiente] = useState(null)
  // Código con el que se autorizó; viaja al backend al cobrar
  const [autorizacionDescuento, setAutorizacionDescuento] = useState(null)

  // Cancelación de la comanda cargada
  const [mostrarModalCancelarComanda, setMostrarModalCancelarComanda] = useState(false)
  const [cancelandoComanda, setCancelandoComanda] = useState(false)

  // Efectivo con el que paga el cliente, para calcular el cambio
  const [montoRecibido, setMontoRecibido] = useState('')

  // Estado para enviar ticket por WhatsApp
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('')

  // Comandas terminadas sin pagar (para cobrar después)
  const [comandasTerminadasSinPagar, setComandasTerminadasSinPagar] = useState([])
  const [comandaTerminadaSeleccionada, setComandaTerminadaSeleccionada] = useState(null)

  // Comanda que se está editando para agregarle productos (llega desde Barista)
  const [comandaEnEdicion, setComandaEnEdicion] = useState(null)

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

  /** Carga una comanda en el panel de orden para agregarle productos. */
  const abrirComandaParaEditar = async (idComanda) => {
    try {
      const comanda = await obtenerComanda(idComanda)
      if (!comanda || comanda.error) {
        throw new Error(comanda?.error || 'No se pudo cargar la comanda')
      }
      setCart(convertirComandaTerminadaACarrito(comanda))
      setComandaEnEdicion(comanda)
      setComandaTerminadaSeleccionada(null)
      setNombreCliente(comanda.venta_nombre_cliente || comanda.pedido?.nombre_cliente || '')
      setTipoServicio(comanda.venta_tipo_servicio === 'para-llevar' ? 'para-llevar' : 'comer-aqui')
      setMetodoPago(null)
      setPropinaPorcentaje(null)
      setMontoPropina(0)
      removerDescuento()
      subirPanelOrden()
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo abrir la comanda',
        text: error.response?.data?.detail || error.message || 'Intenta de nuevo',
        confirmButtonColor: '#10b981',
      })
    }
  }

  // Barista manda aquí para agregarle productos a una comanda existente
  useEffect(() => {
    const idComanda = location.state?.editarComandaId
    if (!idComanda) return

    // Limpiar el estado de navegación para no reentrar al refrescar
    navigate(location.pathname, { replace: true, state: null })
    abrirComandaParaEditar(idComanda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.editarComandaId])

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
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(product)

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
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(product)

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
  
  const toggleExtra = (productId, extraId, grupo = null) => {
    const opciones = opcionesProductos[productId] || { tipoLeche: 'entera', extras: [] }
    const extrasActuales = opciones.extras || []

    let nuevosExtras
    if (extrasActuales.includes(extraId)) {
      nuevosExtras = extrasActuales.filter((id) => id !== extraId)
    } else if (grupo?.seleccion === 'unica') {
      // En un grupo de opción única (por ejemplo Hazlo Combo: jugo o fruta)
      // elegir una reemplaza a la que estuviera seleccionada del mismo grupo.
      const hermanas = new Set(grupo.opciones?.map((o) => o.id) || getClavesDelGrupo(grupo.clave))
      nuevosExtras = [...extrasActuales.filter((id) => !hermanas.has(id)), extraId]
    } else {
      nuevosExtras = [...extrasActuales, extraId]
    }

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

  /** Precio del renglón tolerante a nulos: `precio` en 0 no debe caer a `price`. */
  const precioItem = (item) => {
    const valor = parseFloat(item?.precio ?? item?.price)
    return Number.isFinite(valor) ? valor : 0
  }

  const total = cart.reduce((sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0), 0)

  /** Productos que todavía no pasan por cocina; los entregados vienen marcados. */
  const hayItemsNuevos = cart.some((item) => !item.entregado)

  // Con propina personalizada el estado guarda 'personalizado', pero el backend
  // espera un número: en ese caso el porcentaje va nulo y solo viaja el monto.
  const propinaPorcentajeNumerico =
    typeof propinaPorcentaje === 'number' ? propinaPorcentaje : null

  const etiquetaPropina = () => {
    if (!propinaPorcentaje) return 'Agregar propina'
    if (propinaPorcentajeNumerico != null) return `Propina ${propinaPorcentajeNumerico}%`
    return `Propina $${Number(montoPropina || 0).toFixed(2)}`
  }

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

    setMontoRecibido('')
    setMostrarModalFinalizar(true)
  }

  /**
   * Imprime la cuenta que se entrega al cliente cuando pide pagar.
   * A diferencia del recibo, no lleva método de pago y sugiere propina.
   * Si recibe una comanda la usa como origen; si no, usa la orden en pantalla.
   */
  const imprimirCuenta = async (comanda = null) => {
    const itemsOrden = comanda ? convertirComandaTerminadaACarrito(comanda) : cart

    if (!itemsOrden.length) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin productos',
        text: 'Agrega productos a la orden antes de imprimir la cuenta.',
        confirmButtonColor: '#10b981',
      })
      return
    }

    const base = itemsOrden.reduce(
      (sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0),
      0
    )
    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(itemsOrden)
    const subtotal = base + extraLeche + extraExtras + extraProteina

    // Descuento y propina solo existen sobre la orden cargada en pantalla.
    const descuento = comanda ? 0 : totalDescuento
    const totalDespuesDescuento = Math.max(0, subtotal - descuento)
    const propina = comanda
      ? 0
      : typeof propinaPorcentaje === 'number'
        ? (totalDespuesDescuento * propinaPorcentaje) / 100
        : propinaPorcentaje === 'personalizado'
          ? montoPropina || 0
          : 0

    const referencia = comanda || comandaTerminadaSeleccionada
    const ticket = {
      negocio: 'ZONA 2',
      lugar: 'Brunch and Run',
      tipo: 'cuenta',
      numero: referencia?.numero_dia ?? referencia?.numero_pedido_dia ?? numeroTicket,
      cliente: comanda
        ? comanda.venta_nombre_cliente || null
        : nombreCliente || comandaTerminadaSeleccionada?.venta_nombre_cliente || null,
      tipoServicio: comanda ? comanda.venta_tipo_servicio || null : tipoServicio || null,
      cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
      comentarios: comanda ? null : comentarios || null,
      items: itemsDesdeCarrito(itemsOrden),
      subtotal,
      descuento,
      propina,
      total: totalDespuesDescuento + propina,
    }

    await enviarTicketAImpresora(ticket, 'Cuenta impresa', 'Entrégala al cliente.')
  }

  /**
   * Manda el ticket a la impresora térmica y, si falla o no hay conexión,
   * ofrece la impresión por el navegador.
   */
  const enviarTicketAImpresora = async (ticket, tituloExito, textoExito) => {
    if (printer.isConnected) {
      try {
        await printer.printTicket(ticket)
        await Swal.fire({
          icon: 'success',
          title: tituloExito,
          text: textoExito,
          timer: 1600,
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
        if (!retry.isConfirmed) return
      }
    }

    const printResult = imprimirTicket(ticket)
    if (printResult?.error) {
      await Swal.fire({
        icon: 'warning',
        title: 'No se pudo imprimir',
        text: printResult.error,
        confirmButtonColor: '#10b981',
      })
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
          autorizacion: autorizacionDescuento || undefined,
          propina_porcentaje: montoPropina > 0 && propinaPorcentajeNumerico != null ? propinaPorcentajeNumerico : undefined,
          propina_monto: montoPropina > 0 ? montoPropina : undefined,
        }
        const resultado = await procesarPagoVenta(comandaTerminadaSeleccionada.id_venta, bodyPago)
        if (resultado?.error) throw new Error(resultado.error)
        await Swal.fire({
          icon: 'success',
          title: '¡Pago procesado!',
          text: 'La orden ha sido cobrada correctamente.',
          timer: 1800,
          showConfirmButton: false,
        })
        setComandaTerminadaSeleccionada(null)
        setCart([])
        setNombreCliente('')
        setTipoServicio('comer-aqui')
        setMetodoPago(null)
        setMontoRecibido('')
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
        autorizacion: autorizacionDescuento,
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
            monto_porcentaje: propinaPorcentajeNumerico,
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

      // Limpiar carrito y resetear
      setCart([])
      setMetodoPago(null)
      setMontoRecibido('')
      setIdCliente(null)
      setNombreCliente('')
      setTipoServicio('comer-aqui')
      setComentarios('')
      setPropinaPorcentaje(null)
      setMontoPropina(0)
      removerDescuento()
      
      // Actualizar número de ticket después de crear la venta
      await cargarNumeroTicket()
      
      await Swal.fire({
        icon: 'success',
        title: '¡Venta procesada!',
        text: 'La venta se ha procesado correctamente.',
        timer: 1800,
        showConfirmButton: false,
      })
      
      // Notificar a otras pantallas (como Barista) que se procesó un pago
      window.dispatchEvent(new CustomEvent('pago-procesado'))
      
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
  const enviarSinPagar = async (nombreForzado = null) => {
    if (cart.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'No hay productos para enviar',
        confirmButtonColor: '#10b981',
      })
      return
    }
    const nombreParaEnviar = (nombreForzado ?? nombreCliente ?? '').trim()
    if (!nombreParaEnviar) {
      // Modal propio en vez de un prompt de SweetAlert: en tablet necesitamos
      // controlar la posición sobre el teclado y que Cancelar sea confiable.
      setNombreClienteTemp('')
      setMostrarModalNombreCliente(true)
      return
    }
    setNombreCliente(nombreParaEnviar)
    setMostrarModalNombreCliente(false)
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
        autorizacion: autorizacionDescuento,
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
        autorizacion: autorizacionDescuento || undefined,
        propina_porcentaje: montoPropina > 0 && propinaPorcentajeNumerico != null ? propinaPorcentajeNumerico : undefined,
        propina_monto: montoPropina > 0 ? montoPropina : undefined,
      }
      const resultado = await procesarPagoVenta(comandaTerminadaSeleccionada.id_venta, bodyPago)
      if (resultado?.error) throw new Error(resultado.error)
      await Swal.fire({
        icon: 'success',
        title: '¡Pago procesado!',
        text: 'La orden ha sido cobrada correctamente.',
        timer: 1800,
        showConfirmButton: false,
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

  const calcularSubtotalConExtras = () => {
    const subtotal = cart.reduce((sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0), 0)
    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
    return subtotal + extraLeche + extraExtras + extraProteina
  }

  /**
   * Totales de la orden en pantalla. La propina se calcula sobre el importe ya
   * descontado, igual que al cobrar y al imprimir.
   */
  const resumenOrden = () => {
    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito(cart)
    const totalConExtras = total + extraLeche + extraExtras + extraProteina
    const totalDespuesDescuento = Math.max(0, totalConExtras - totalDescuento)
    const propina =
      typeof propinaPorcentaje === 'number'
        ? (totalDespuesDescuento * propinaPorcentaje) / 100
        : propinaPorcentaje === 'personalizado'
          ? montoPropina || 0
          : 0
    return {
      extraLeche,
      extraExtras,
      extraProteina,
      descuento: totalDescuento,
      propina,
      propinaLabel:
        propinaPorcentaje === 'personalizado'
          ? 'Propina (personalizado)'
          : typeof propinaPorcentaje === 'number'
            ? `Propina (${propinaPorcentaje}%)`
            : 'Propina',
      totalFinal: totalDespuesDescuento + propina,
    }
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
      const subtotal = cart.reduce((sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0), 0)
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

  /**
   * Traduce cualquier descuento a porcentaje sobre el total sin descontar, así
   * un descuento por monto tampoco puede saltarse el umbral de autorización.
   */
  const porcentajeEfectivo = (tipo, valor) => {
    const totalBase = calcularSubtotalConExtras()
    if (tipo === 'porcentaje') return valor
    if (totalBase <= 0) return 0
    return (Math.min(valor, totalBase) / totalBase) * 100
  }

  const descuentoNecesitaAutorizacion = (tipo, valor) =>
    !isAdmin(usuario?.rol) && porcentajeEfectivo(tipo, valor) >= UMBRAL_DESCUENTO_AUTORIZACION

  /** Aplica el descuento ya validado; `autorizacion` viaja luego con la venta. */
  const aplicarDescuento = (tipo, valor, autorizacion = null) => {
    const totalBase = calcularSubtotalConExtras()
    setDescuentoTipo(tipo)
    setDescuentoValor(valor)
    setTotalDescuento(
      tipo === 'porcentaje'
        ? Math.min((totalBase * valor) / 100, totalBase)
        : Math.min(valor, totalBase)
    )
    setAutorizacionDescuento(autorizacion)
    setDescuentoPersonalizado('')
    setMostrarModalDescuento(false)
  }

  /** Pide autorización si hace falta y solo entonces aplica el descuento. */
  const pedirDescuento = (tipo, valor) => {
    if (descuentoNecesitaAutorizacion(tipo, valor)) {
      setDescuentoPendiente({ tipo, valor })
      return
    }
    aplicarDescuento(tipo, valor)
  }

  // Función para seleccionar descuento por porcentaje (5, 10, 15, 20, 50, 100)
  const seleccionarDescuento = (porcentaje) => {
    pedirDescuento('porcentaje', porcentaje)
  }

  // Función para aplicar descuento personalizado (porcentaje o monto)
  const aplicarDescuentoPersonalizado = () => {
    const valor = parseFloat(descuentoPersonalizado)
    if (isNaN(valor) || valor <= 0) return
    pedirDescuento(tipoDescuentoPersonalizado === 'porcentaje' ? 'porcentaje' : 'monto', valor)
  }

  // Función para remover descuento
  const removerDescuento = () => {
    setDescuentoTipo(null)
    setDescuentoValor(null)
    setTotalDescuento(0)
    setDescuentoPersonalizado('')
    setAutorizacionDescuento(null)
  }

  // Función para parsear observaciones y extraer tipo de leche, extras y tipo de proteína
  const parsearObservaciones = (observaciones) => parseObservacionesProducto(observaciones)

  // Convierte los detalles de una comanda en items del carrito
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
      // El id del renglón evita colisiones entre un producto ya entregado y otro
      // idéntico agregado después, que deben poder coexistir por separado.
      const uniqueId = `comanda-${comanda.id_comanda}-${detalle.id_detalle_comanda ?? `${detalle.id_producto ?? idx}-${tipoLecheHash}-${extrasHash}-${tipoProteinaHash}`}`
      const cartItem = {
        id: uniqueId,
        id_producto: detalle.id_producto,
        id_detalle_comanda: detalle.id_detalle_comanda ?? null,
        entregado: Boolean(detalle.entregado),
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
    setMetodoPago(null)
    setPropinaPorcentaje(null)
    setMontoPropina(0)
    removerDescuento()
  }

  /** Regresa el panel de la orden al inicio; al vaciarlo el scroll queda colgado. */
  const subirPanelOrden = () => {
    panelOrdenRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const salirDeEdicion = () => {
    setComandaEnEdicion(null)
    setCart([])
    setNombreCliente('')
    setTipoServicio('comer-aqui')
    setComentarios('')
    subirPanelOrden()
  }

  /** Deja el panel de Orden Actual completamente vacío, sin comanda ni ajustes de cobro. */
  const limpiarOrden = () => {
    setComandaTerminadaSeleccionada(null)
    setCart([])
    setNombreCliente('')
    setTipoServicio('comer-aqui')
    setComentarios('')
    setMetodoPago(null)
    setMontoRecibido('')
    removerPropina()
    removerDescuento()
    subirPanelOrden()
  }

  // La comanda que se cancelaría: la que está en edición o la mesa seleccionada.
  const comandaCancelable = comandaEnEdicion || comandaTerminadaSeleccionada

  /**
   * Cancela la comanda en el sistema, no solo en pantalla.
   *
   * Queda como 'cancelada' y su venta se salda con un descuento del 100%: no
   * se borra nada y el inventario ya consumido se respeta.
   */
  const confirmarCancelarComanda = async (autorizacion) => {
    if (!comandaCancelable) return
    setCancelandoComanda(true)
    try {
      await cancelarComanda(comandaCancelable.id_comanda, autorizacion)
      setMostrarModalCancelarComanda(false)
      limpiarOrden()
      setComandaEnEdicion(null)
      await cargarComandasTerminadasSinPagar()
      window.dispatchEvent(new CustomEvent('comanda-actualizada'))
      await Swal.fire({
        icon: 'success',
        title: 'Comanda cancelada',
        text: 'Quedó registrada como cancelada; el inventario no se modificó.',
        confirmButtonColor: '#10b981',
        timer: 2200,
      })
    } catch (error) {
      const detalle = error?.response?.data?.detail
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo cancelar',
        text: typeof detalle === 'string' ? detalle : 'Intenta de nuevo.',
        confirmButtonColor: '#10b981',
      })
    } finally {
      setCancelandoComanda(false)
    }
  }

  /**
   * El botón inferior cambia de significado según haya o no una comanda cargada:
   * sin comanda solo limpia el panel, con comanda cancela de verdad. La "X" del
   * encabezado siempre se queda con el comportamiento de solo soltar la mesa.
   */
  const accionCancelarOrden = () => {
    if (comandaCancelable) {
      setMostrarModalCancelarComanda(true)
      return
    }
    limpiarOrden()
  }

  /** Guarda los productos agregados a la comanda abierta y los manda al barista. */
  const guardarEdicionComanda = async () => {
    // La mesa puede venir del botón Agregar o de seleccionarla para cobrar.
    const comandaObjetivo = comandaEnEdicion || comandaTerminadaSeleccionada
    if (!comandaObjetivo) return

    if (!cart.some((item) => !item.entregado)) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin productos nuevos',
        text: 'Agrega al menos un producto para guardar los cambios.',
        confirmButtonColor: '#10b981',
      })
      return
    }

    const detalles = cart.map((item) => {
      const rawId = item.id_producto ?? item.id
      const idProducto = rawId != null && String(rawId).match(/^\d+$/) ? Number(rawId) : null
      return {
        id_detalle_comanda: item.id_detalle_comanda ?? null,
        id_producto: idProducto,
        cantidad: Number(item.quantity) || 0,
        precio_unitario: parseFloat(String(item.precio).replace(/,/g, '')) || 0,
        observaciones: item.observaciones || null,
        tipo_preparacion: item.tipoPreparacion || null,
        nombre_producto: item.personalizado ? (item.nombre || item.nombre_producto) : (item.nombre || null),
      }
    })

    try {
      setProcesando(true)
      const resultado = await editarComanda(comandaObjetivo.id_comanda, {
        detalles,
        total: calcularSubtotalConExtras(),
      })
      if (resultado?.error) throw new Error(resultado.error)

      window.dispatchEvent(new CustomEvent('comanda-actualizada'))
      // Veníamos de cobrar: la mesa vuelve a cocina, no se queda seleccionada.
      const veniaDeBarista = Boolean(comandaEnEdicion)
      salirDeEdicion()
      setComandaTerminadaSeleccionada(null)
      await cargarComandasTerminadasSinPagar()

      await Swal.fire({
        icon: 'success',
        title: 'Enviado a comandas',
        text: resultado?.reabierta
          ? 'Los productos nuevos ya están en la lista del barista.'
          : 'Los productos se agregaron a la comanda.',
        timer: 2200,
        showConfirmButton: false,
      })
      if (veniaDeBarista) navigate('/barista')
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'No se pudo actualizar la comanda'
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: errorMsg,
        confirmButtonColor: '#10b981',
      })
    } finally {
      setProcesando(false)
    }
  }

  const puedeCobrarOrden = puedeCobrar(usuario?.rol)

  // Propina y descuento se calculan sobre el total, así que no tienen sentido
  // mientras la orden esté vacía.
  const ordenVacia = cart.length === 0
  const claseIconoOrden = (activo, claseActiva) =>
    ordenVacia
      ? 'p-2 rounded-lg text-gray-300 cursor-not-allowed'
      : `p-2 rounded-lg transition-colors hover:bg-gray-100 ${activo ? claseActiva : 'text-gray-600'}`

  // Función para formatear fecha

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
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(producto)

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
  const opcionesDelModal = opcionesDelProducto(productoOpcionesModal)
  const modalLlevaLeche = opcionesDelModal.llevaLeche
  const modalLlevaExtras = opcionesDelModal.llevaExtras
  const modalLlevaProteina = opcionesDelModal.llevaProteina
  // Cada grupo asignado al producto se pinta como una sección propia ("Extras",
  // "Agrega Power", "Toppings"). Sin grupos cargados se cae a la lista completa.
  const gruposDelModal = opcionesDelModal.grupos.length
    ? opcionesDelModal.grupos
    : modalLlevaExtras
      ? [{ clave: 'extras', nombre: 'Extras', seleccion: 'multiple', opciones: getExtrasDisponibles() }]
      : []

  return (
    <div className="h-full min-h-0 pt-3 px-2 pb-2 flex flex-col landscape:flex-row gap-2 overflow-hidden">
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
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                {productosFiltrados.map((product) => renderProductTile(product))}
              </div>
            )
          ) : !categoriaActiva ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(115px,1fr))] gap-2">
              {categories.map((category) => {
                const count = productosDeCategoria(category).length
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => abrirCategoria(category)}
                    className="min-h-[76px] rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-matcha-500 hover:bg-matcha-50 active:scale-[0.98] transition-all p-2 flex flex-col items-center justify-center text-center"
                  >
                    <span className="font-semibold text-gray-900 text-sm leading-tight">{category}</span>
                    <span className="text-[11px] text-gray-500 mt-0.5">{count} items</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              
              <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 pt-1">
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
        <div
          ref={panelOrdenRef}
          className="w-full flex-none min-h-0 max-h-[50%] landscape:w-[340px] landscape:max-w-[360px] landscape:max-h-none lg:landscape:w-[360px] flex flex-col overflow-y-auto overscroll-contain gap-2"
        >
          {/* Orden actual (incluye la comanda de una mesa abierta lista para cobrar) */}
            <div className="card shrink-0 !p-3">
            
              <>
                {/* Vista de Carrito Normal (incluye comanda lista para cobrar) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-matcha-600" />
                    <h2 className="text-base font-semibold text-gray-900">
                      {comandaEnEdicion
                        ? `Editando comanda ${comandaEnEdicion.numero_dia ?? comandaEnEdicion.id_comanda}`
                        : comandaTerminadaSeleccionada
                          ? 'Para cobrar'
                          : 'Orden Actual'}
                    </h2>
                    {comandaEnEdicion && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                        Agregando
                      </span>
                    )}
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
                        onClick={limpiarOrden}
                        className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-600 font-bold"
                        title="Quitar comanda"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                    <div className="flex items-center gap-1">
                    <button
                        onClick={() => setMostrarModalPropina(true)}
                        disabled={ordenVacia}
                        className={claseIconoOrden(propinaPorcentaje, 'text-matcha-600 bg-matcha-50')}
                        title={ordenVacia ? 'Agrega productos para asignar propina' : etiquetaPropina()}
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
                        disabled={ordenVacia}
                        className={claseIconoOrden(totalDescuento > 0, 'text-amber-600 bg-amber-50')}
                        title={ordenVacia ? 'Agrega productos para aplicar descuento' : (totalDescuento > 0 ? `Descuento ${descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + totalDescuento.toFixed(2)}` : 'Agregar descuento')}
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
                    // Lo que ya se entregó al cliente no se toca, ni editando la
                    // comanda ni cobrándola: el backend cobra el total guardado,
                    // así que cambiarlo aquí solo desajustaría lo que se ve.
                    const bloqueado = Boolean(item.entregado)

                    return (
                      <div
                        key={item.id}
                        className={`flex items-start justify-between p-3 rounded-lg ${
                          bloqueado ? 'bg-gray-100 border border-dashed border-gray-300' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`font-medium text-sm ${bloqueado ? 'text-gray-500' : 'text-gray-900'}`}>
                            {item.nombre || item.name}
                          </p>
                          {bloqueado && (
                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-200 text-gray-600">
                              YA ENTREGADO
                            </span>
                          )}
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
                            ${precioItem(item).toFixed(2)} c/u
                          </p>
                        </div>
                        {bloqueado ? (
                          <span className="ml-2 text-sm font-semibold text-gray-500">
                            x{item.quantity}
                          </span>
                        ) : (
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
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  {/* Calcular total con extras y propina */}
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0), 0)
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

                  {/* Mesa abierta con productos nuevos: primero van a cocina, no a caja.
                      Cobrar antes de guardarlos usaría el total viejo de la venta. */}
                  {comandaEnEdicion || (comandaTerminadaSeleccionada && hayItemsNuevos) ? (
                    <>
                      {comandaTerminadaSeleccionada && hayItemsNuevos && (
                        <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                          Hay productos nuevos sin preparar. Envíalos a comandas antes de cobrar la mesa.
                        </p>
                      )}
                      <button
                        onClick={guardarEdicionComanda}
                        disabled={procesando || comandaLoading || !hayItemsNuevos}
                        className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {(procesando || comandaLoading) && <Loader2 className="w-5 h-5 animate-spin" />}
                        <ChefHat className="w-5 h-5" />
                        Enviar a Comandas
                      </button>
                      <button
                        onClick={() => {
                          if (comandaEnEdicion) {
                            salirDeEdicion()
                            navigate('/barista')
                          } else {
                            limpiarOrden()
                          }
                        }}
                        className="w-full py-2 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        Cancelar Edición
                      </button>
                    </>
                  ) : (
                  <>
                  {/* Cuenta para el cliente: se imprime antes de cobrar */}
                  <button
                    onClick={() => imprimirCuenta()}
                    className="w-full py-3 text-base border-2 border-coffee-500 text-coffee-700 bg-coffee-50 hover:bg-coffee-100 rounded-lg font-semibold flex items-center justify-center gap-2"
                    title="Imprime la cuenta para entregarla al cliente (no cobra la orden)"
                  >
                    <Receipt className="w-5 h-5" />
                    Imprimir Cuenta
                  </button>

                  {!comandaTerminadaSeleccionada && (
                    <>
                  {/* Enviar sin pagar: preparar primero, cobrar cuando esté lista */}
                  <button
                    onClick={() => enviarSinPagar()}
                    disabled={procesando || ventaLoading || comandaLoading}
                    className="w-full py-2.5 text-sm border border-amber-500 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title="Enviar a cocina para preparar, cobrar cuando esté lista (se pedirá el nombre del cliente si no está)"
                  >
                    {(procesando || ventaLoading || comandaLoading) && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Enviar a Comandas
                  </button>
                    </>
                  )}

                  {puedeCobrarOrden && (
                    <>
                  <div className={`grid gap-3 ${metodosPagoActivos.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {metodosPagoActivos.map((metodo) => (
                      <button
                        key={metodo.id}
                        onClick={() => setMetodoPago(metodo.id)}
                        className={claseMetodoPago(metodoPago === metodo.id)}
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
                    </>
                  )}
                  <button
                    onClick={accionCancelarOrden}
                    className="w-full py-2 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                  >
                    {comandaCancelable ? 'Cancelar Comanda' : 'Cancelar Orden'}
                  </button>
                  </>
                  )}
                </div>
              </>
            )}
              </>
          </div>

          {/* Mesas abiertas: ya se entregó lo pedido pero la cuenta sigue viva */}
          {comandasTerminadasSinPagar.length > 0 && (
            <div className="card mb-2 !p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-amber-600" />
                <h2 className="text-base font-semibold text-gray-900">Mesas abiertas</h2>
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
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                          Sin pagar
                        </span>
                        <button
                          onClick={() => imprimirCuenta(comanda)}
                          className="px-3 py-1.5 text-xs border border-coffee-400 text-coffee-700 bg-white hover:bg-coffee-50 rounded-lg font-medium flex items-center gap-1.5"
                          title="Imprimir la cuenta de esta comanda sin cobrarla"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          Cuenta
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

      {/* Modal opciones de producto (leche / extras / proteína) */}
      {productoOpcionesModal && opcionesModal && (
        <div
          className={OVERLAY_MODAL}
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
                    {getLechesDisponibles().map((opt) => (
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

              {gruposDelModal.map((grupo) => {
                const eligeUna = grupo.seleccion === 'unica'
                return (
                  <div key={grupo.clave}>
                    <div className="flex items-baseline gap-2 mb-2">
                      <p className="text-sm font-medium text-gray-700">{grupo.nombre}</p>
                      <span className="text-xs text-gray-400">
                        {eligeUna ? 'Elige una' : 'Puedes elegir varias'}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {grupo.opciones.map((opcion) => {
                        const activo = (opcionesModal.extras || []).includes(opcion.id)
                        return (
                          <button
                            key={opcion.id}
                            type="button"
                            onClick={() =>
                              toggleExtra(productoOpcionesModal.id_producto, opcion.id, grupo)
                            }
                            className={`min-h-[52px] px-4 py-3 rounded-xl border-2 flex items-center gap-3 text-left text-base font-medium transition-all ${
                              activo
                                ? 'border-matcha-500 bg-matcha-50 text-matcha-800'
                                : 'border-gray-200 text-gray-800'
                            }`}
                          >
                            {/* Redondo si sólo cabe una, cuadrado si caben varias */}
                            <span
                              className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center ${
                                eligeUna ? 'rounded-full' : 'rounded'
                              } ${activo ? 'border-matcha-600' : 'border-gray-300'}`}
                            >
                              {activo &&
                                (eligeUna ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-matcha-600" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-matcha-600" strokeWidth={3} />
                                ))}
                            </span>
                            <span>
                              {opcion.label}
                              {opcion.precio > 0 ? ` (+$${opcion.precio})` : ''}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

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

      {/* Modal Nombre del cliente (antes de mandar la orden a comandas) */}
      {mostrarModalNombreCliente && (
        <div
          className={OVERLAY_MODAL}
          onClick={() => setMostrarModalNombreCliente(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (!nombreClienteTemp.trim()) return
                enviarSinPagar(nombreClienteTemp)
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nombreClienteTemp}
                  onChange={(e) => setNombreClienteTemp(e.target.value)}
                  placeholder="Con qué nombre identificamos la mesa"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { valor: 'comer-aqui', texto: 'Comer aquí' },
                  { valor: 'para-llevar', texto: 'Para llevar' },
                ].map((opcion) => (
                  <button
                    key={opcion.valor}
                    type="button"
                    onClick={() => setTipoServicio(opcion.valor)}
                    className={`py-2.5 px-3 rounded-lg border-2 text-sm transition-all ${
                      tipoServicio === opcion.valor
                        ? 'border-matcha-500 bg-matcha-50 text-matcha-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {opcion.texto}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nota para el barista <span className="text-gray-400">(Opcional)</span>
                </label>
                <textarea
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={2}
                  placeholder="Sin azúcar, extra caliente, etc."
                  className="input w-full resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNombreCliente(false)}
                  className="flex-1 py-2.5 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreClienteTemp.trim() || procesando}
                  className="btn-primary flex-1 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Finalizar Pedido */}
      {mostrarModalFinalizar && (
        <div
          className={OVERLAY_MODAL}
          onClick={() => setMostrarModalFinalizar(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contenido */}
            <div className="p-4 space-y-4">
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

              {/* Totales */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex items-center justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                {/* Calcular extras, descuento, propina y total final */}
                {(() => {
                  const resumen = resumenOrden()
                  return (
                    <>
                      {resumen.extraLeche > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extra Leche:</span>
                          <span>+${resumen.extraLeche.toFixed(2)}</span>
                        </div>
                      )}
                      {resumen.extraExtras > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Extras:</span>
                          <span>+${resumen.extraExtras.toFixed(2)}</span>
                        </div>
                      )}
                      {resumen.extraProteina > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>Proteína:</span>
                          <span>+${resumen.extraProteina.toFixed(2)}</span>
                        </div>
                      )}
                      {resumen.descuento > 0 && (
                        <div className="flex items-center justify-between text-amber-600">
                          <span>Descuento ({descuentoTipo === 'porcentaje' ? descuentoValor + '%' : '$' + resumen.descuento.toFixed(2)}):</span>
                          <span>-${resumen.descuento.toFixed(2)}</span>
                        </div>
                      )}
                      {resumen.propina > 0 && (
                        <div className="flex items-center justify-between text-gray-600">
                          <span>{resumen.propinaLabel}:</span>
                          <span>+${resumen.propina.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>Total:</span>
                        <span className="text-matcha-600">
                          ${resumen.totalFinal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Cambio: solo tiene sentido cuando el cliente paga con billetes */}
              {metodoPago === 'efectivo' && (() => {
                const totalACobrar = resumenOrden().totalFinal
                const recibido = parseFloat(montoRecibido)
                const cambio = Number.isFinite(recibido) ? recibido - totalACobrar : null
                return (
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Paga con <span className="text-gray-400">(Opcional)</span>
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder={`Ej: ${Math.ceil(totalACobrar / 50) * 50}`}
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                      className="input w-full"
                    />
                    {cambio != null && (
                      <div
                        className={`flex items-center justify-between text-lg font-bold ${
                          cambio < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        <span>{cambio < 0 ? 'Faltan:' : 'Cambio:'}</span>
                        <span>${Math.abs(cambio).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )
              })()}
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

      {/* Modal Propina */}
      {mostrarModalPropina && (
        <div
          className={OVERLAY_MODAL}
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
          className={OVERLAY_MODAL}
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
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[5, 10, 15, 20, 50, 100].map((porcentaje) => {
                  const seleccionado = descuentoTipo === 'porcentaje' && descuentoValor === porcentaje
                  const pideCodigo = descuentoNecesitaAutorizacion('porcentaje', porcentaje)
                  return (
                    <button
                      key={porcentaje}
                      onClick={() => seleccionarDescuento(porcentaje)}
                      title={pideCodigo ? 'Requiere código de autorización' : undefined}
                      className={`relative py-4 px-2 rounded-lg border-2 transition-all text-center ${
                        seleccionado
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      <div className="text-2xl font-bold text-gray-900">{porcentaje}%</div>
                      {pideCodigo && (
                        <Lock className="w-3.5 h-3.5 text-amber-600 absolute top-1.5 right-1.5" />
                      )}
                    </button>
                  )
                })}
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

      {/* Autorización para descuentos altos */}
      <ModalAutorizacion
        abierto={Boolean(descuentoPendiente)}
        titulo="Autorizar descuento"
        mensaje={
          descuentoPendiente
            ? `Un descuento de ${
                descuentoPendiente.tipo === 'porcentaje'
                  ? `${descuentoPendiente.valor}%`
                  : `$${Number(descuentoPendiente.valor).toFixed(2)}`
              } necesita autorización.`
            : ''
        }
        textoConfirmar="Aplicar descuento"
        requiereCodigo
        onConfirmar={(codigo) => {
          aplicarDescuento(descuentoPendiente.tipo, descuentoPendiente.valor, codigo)
          setDescuentoPendiente(null)
        }}
        onCancelar={() => setDescuentoPendiente(null)}
      />

      {/* Cancelación de la comanda cargada */}
      <ModalAutorizacion
        abierto={mostrarModalCancelarComanda}
        titulo="Cancelar comanda"
        mensaje={
          comandaCancelable
            ? `Se cancelará la comanda #${comandaCancelable.id_comanda}${
                comandaCancelable.nombre_cliente ? ` de ${comandaCancelable.nombre_cliente}` : ''
              }. Quedará registrada como cancelada y el inventario ya consumido no se devuelve.`
            : ''
        }
        textoConfirmar="Sí, cancelar"
        peligro
        requiereCodigo={!isAdmin(usuario?.rol)}
        procesando={cancelandoComanda}
        onConfirmar={confirmarCancelarComanda}
        onCancelar={() => setMostrarModalCancelarComanda(false)}
      />
    </div>
  )
}

export default PuntoVenta


