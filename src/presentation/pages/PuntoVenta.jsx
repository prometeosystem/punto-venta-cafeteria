import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, Minus, Trash2, ShoppingCart, Loader2, X, Search, Coins, Percent, Check, CheckCircle, ChefHat, Lock, Bike, Utensils, ShoppingBag, CreditCard, Banknote, ArrowLeftRight, Image as ImageIcon, ImageOff, LayoutGrid, Folder, ChevronUp, ChevronDown } from 'lucide-react'
import { useProductos } from '../hooks/useProductos'
import { useVentas } from '../hooks/useVentas'
import { useComandas } from '../hooks/useComandas'
import { useAuth } from '../context/AuthContext'
import { usePreferencias } from '../context/PreferenciasContext'
import { productoDelModo } from '../utils/preferenciasUi'
import { useCaja } from '../hooks/useCaja'
import { productosService } from '../../application/services/productosService'
import { imprimirTicket, itemsDesdeCarrito } from '../utils/imprimirTicket'
import { obtenerMetodosPagoActivos } from '../utils/metodosPagoConfig'
import { obtenerImagenCacheada, obtenerPosConFotos, guardarPosConFotos } from '../utils/posVistaConfig'
import { API_BASE_URL } from '../../infrastructure/api'
import { isAdmin, puedeCobrar } from '../utils/rolePermissions'
import ModalAutorizacion from '../components/ModalAutorizacion'
import BilletesEfectivo from '../components/BilletesEfectivo'
import DividirCuentaModal from '../components/DividirCuentaModal'
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
  esProductoComida,
  sortMenuCategories,
  tieneScoopProteina,
} from '../utils/productOptionsConfig'
import { useOpcionesProducto } from '../hooks/useOpcionesProducto'
import { reportesService } from '../../application/services/reportesService'
import { clave } from '../utils/almacenLocal'
import marca from '@marca'
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

const firmaMesasAbiertas = (lista) =>
  (lista || [])
    .map((c) => [c.id_comanda, c.total, c.venta_nombre_cliente, c.numero_dia, c.estado].join(':'))
    .join('|')

/**
 * A partir de este porcentaje un descuento deja de ser cortesía y necesita
 * autorización. El backend valida lo mismo, esto solo evita el viaje en vano.
 */
const UMBRAL_DESCUENTO_AUTORIZACION = 15

/**
 * Métodos de pago en fila de iconos. Cada uno tiene su color al seleccionarlo
 * para distinguirlos de un vistazo; el verde sólido se reserva para Procesar Venta.
 */
const ICONOS_METODO_PAGO = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  delivery: Bike,
  transferencia: ArrowLeftRight,
}

const COLORES_METODO_PAGO = {
  efectivo: 'border-marca-500 bg-marca-50 text-marca-700',
  tarjeta: 'border-blue-500 bg-blue-50 text-blue-700',
  delivery: 'border-purple-500 bg-purple-50 text-purple-700',
  transferencia: 'border-amber-500 bg-amber-50 text-amber-700',
}

const claseMetodoPago = (id, seleccionado) =>
  `flex-1 min-w-0 py-2.5 rounded-lg border-2 transition-colors inline-flex items-center justify-center ${
    seleccionado
      ? COLORES_METODO_PAGO[id] || 'border-marca-500 bg-marca-50 text-marca-700'
      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
  }`

const CLAVE_MESAS_ABIERTAS = clave('pos_mesas_abiertas')
const CLAVE_VISTA_CATALOGO = clave('pos_vista')

const vistaMovilVertical = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(orientation: portrait) and (max-width: 1024px)').matches

const mesasAbiertasGuardadas = () => {
  if (vistaMovilVertical()) return false
  try {
    return localStorage.getItem(CLAVE_MESAS_ABIERTAS) !== 'comprimida'
  } catch {
    return true
  }
}

const PuntoVenta = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const printer = usePrinterContext()
  const panelOrdenRef = useRef(null)
  const searchInputRef = useRef(null)
  const cobroExactoPendienteRef = useRef(false)
  const [cart, setCart] = useState([])
  const [lineaEditandoId, setLineaEditandoId] = useState(null)
  const [ordenDesplegada, setOrdenDesplegada] = useState(false)
  const [mesasDesplegadas, setMesasDesplegadas] = useState(mesasAbiertasGuardadas)
  const [categoriaActiva, setCategoriaActiva] = useState(null)
  const [idsMasVendidos, setIdsMasVendidos] = useState([])
  const [metodoPago, setMetodoPago] = useState(null)
  const [montoEfectivoPago, setMontoEfectivoPago] = useState('')
  const [montoTarjetaPago, setMontoTarjetaPago] = useState('')
  const [idCliente, setIdCliente] = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [verTodos, setVerTodos] = useState(() => localStorage.getItem(CLAVE_VISTA_CATALOGO) === 'todos')
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
  const { modoRestaurante, modoTienda } = usePreferencias()
  const catalogo = useMemo(
    () => productos.filter((producto) => productoDelModo(producto, modoTienda)),
    [productos, modoTienda],
  )
  const { estado: estadoCaja, loading: cajaLoading } = useCaja(15000)
  const [metodosPagoActivos, setMetodosPagoActivos] = useState(() => obtenerMetodosPagoActivos())
  const [posConFotos, setPosConFotos] = useState(() => obtenerPosConFotos())
  const [fotosPorId, setFotosPorId] = useState({})
  const [cacheFotos, setCacheFotos] = useState(0)
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
  const [mostrarDividirCuenta, setMostrarDividirCuenta] = useState(false)

  // Estado para enviar ticket por WhatsApp
  const [numeroWhatsApp, setNumeroWhatsApp] = useState('')

  // Comandas terminadas sin pagar (para cobrar después)
  const [comandasTerminadasSinPagar, setComandasTerminadasSinPagar] = useState([])
  const [comandaTerminadaSeleccionada, setComandaTerminadaSeleccionada] = useState(null)

  // Comanda que se está editando para agregarle productos (llega desde Barista)
  const [comandaEnEdicion, setComandaEnEdicion] = useState(null)

  // Mesa del plano para la que se arma la orden: { id, numero }
  const [mesaOrden, setMesaOrden] = useState(null)
  // Comanda que el plano de mesas mandó a cobrar; se elige al llegar la lista
  const [cobrarPendiente, setCobrarPendiente] = useState(null)
  const [terminadasCargadas, setTerminadasCargadas] = useState(false)

  // Estados para producto personalizado
  const [nombreProductoPersonalizado, setNombreProductoPersonalizado] = useState('')
  const [precioProductoPersonalizado, setPrecioProductoPersonalizado] = useState('')
  const [areaProductoPersonalizado, setAreaProductoPersonalizado] = useState('barra')
  const [mostrarModalPersonalizado, setMostrarModalPersonalizado] = useState(false)

  // En el celular vertical la lista nace cerrada. En las demás vistas se
  // recupera lo último que eligió la persona, aunque cambie de pantalla.
  useEffect(() => {
    const consulta = window.matchMedia('(orientation: portrait) and (max-width: 1024px)')
    const aplicar = () => {
      if (consulta.matches) {
        setMesasDesplegadas(false)
        return
      }
      try {
        setMesasDesplegadas(localStorage.getItem(CLAVE_MESAS_ABIERTAS) !== 'comprimida')
      } catch {
        setMesasDesplegadas(true)
      }
    }
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [])

  const alternarMesasAbiertas = () => {
    setMesasDesplegadas((abierta) => {
      const siguiente = !abierta
      if (!vistaMovilVertical()) {
        try {
          localStorage.setItem(CLAVE_MESAS_ABIERTAS, siguiente ? 'abierta' : 'comprimida')
        } catch {
          // Si el navegador bloquea el almacenamiento, el cambio sigue en esta vista.
        }
      }
      return siguiente
    })
  }

  // Si la caja está cerrada, redirigir a abrir caja
  useEffect(() => {
    if (cajaLoading) return
    if (estadoCaja && estadoCaja.abierta === false) {
      navigate('/caja', { replace: true, state: { from: 'punto-venta', cajaCerrada: true } })
    }
  }, [cajaLoading, estadoCaja, navigate])

  useEffect(() => {
    if (modoTienda && metodoPago === 'delivery') setMetodoPago(null)
  }, [modoTienda, metodoPago])

  // Escuchar cambios de métodos de pago desde Configuración
  useEffect(() => {
    const sync = () => {
      const activos = obtenerMetodosPagoActivos()
      setMetodosPagoActivos(activos)
      setMetodoPago((prev) => {
        if (!prev) return prev
        if (prev === 'mixto') {
          const ids = new Set(activos.map((m) => m.id))
          return ids.has('efectivo') && ids.has('tarjeta') ? prev : null
        }
        return activos.some((m) => m.id === prev) ? prev : null
      })
    }
    const syncFotos = () => setPosConFotos(obtenerPosConFotos())
    const onStorage = (e) => {
      if (e.key === clave('metodos_pago')) sync()
      if (e.key === clave('pos_fotos')) syncFotos()
    }
    window.addEventListener('metodos-pago-config-changed', sync)
    const limpiarFotos = () => setCacheFotos((n) => n + 1)
    window.addEventListener('pos-fotos-changed', syncFotos)
    window.addEventListener('pos-fotos-cache-cleared', limpiarFotos)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('metodos-pago-config-changed', sync)
      window.removeEventListener('pos-fotos-changed', syncFotos)
      window.removeEventListener('pos-fotos-cache-cleared', limpiarFotos)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  // Las fotos salen de la caché del dispositivo. La red solo se usa la primera vez.
  useEffect(() => {
    if (!posConFotos || productos.length === 0) return undefined
    let vivo = true
    Promise.all(catalogo.map(async (producto) => {
      const url = producto.tipo_imagen
        ? `${API_BASE_URL}/api/productos/imagen/${producto.id_producto}?v=${encodeURIComponent(producto.fecha_actualizacion || '')}`
        : null
      const local = url ? await obtenerImagenCacheada(url) : null
      return [producto.id_producto, local]
    })).then((entradas) => {
      if (vivo) setFotosPorId(Object.fromEntries(entradas))
    })
    return () => { vivo = false }
  }, [posConFotos, catalogo, cacheFotos])

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
      const lista = Array.isArray(data) ? data : []
      // Solo se pinta de nuevo si cambió una mesa. Si no, el catálogo no parpadea.
      setComandasTerminadasSinPagar((prev) =>
        firmaMesasAbiertas(prev) === firmaMesasAbiertas(lista) ? prev : lista
      )
    } catch (error) {
      console.error('Error al cargar comandas terminadas sin pagar:', error)
    } finally {
      setTerminadasCargadas(true)
    }
  }
  useEffect(() => {
    cargarComandasTerminadasSinPagar()
    // Respaldo por si la mesa se abrió en otra tablet. No redibuja si la lista sigue igual.
    const interval = setInterval(cargarComandasTerminadasSinPagar, 15000)
    const handleComandaActualizada = () => cargarComandasTerminadasSinPagar()
    const alVolver = () => {
      if (document.visibilityState === 'visible') cargarComandasTerminadasSinPagar()
    }
    window.addEventListener('comanda-actualizada', handleComandaActualizada)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(interval)
      window.removeEventListener('comanda-actualizada', handleComandaActualizada)
      document.removeEventListener('visibilitychange', alVolver)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cargar número de ticket al montar el componente
  useEffect(() => {
    cargarNumeroTicket()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let vivo = true
    const canal = modoTienda ? 'tienda' : 'restaurante'
    reportesService
      .obtenerMasVendidosPos(8, canal)
      .then((data) => {
        if (vivo && Array.isArray(data)) setIdsMasVendidos(data.map((p) => p.id_producto))
      })
      .catch(() => {
        if (vivo) setIdsMasVendidos([])
      })
    return () => {
      vivo = false
    }
  }, [modoTienda])

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
      setMesaOrden(null)
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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

  /**
   * Una comanda pagada es una venta cerrada y no admite cambios, así que lo que
   * el cliente pida después va en una orden nueva. Solo se hereda el nombre y
   * el tipo de servicio para no volver a capturarlos; el cobro es aparte.
   */
  useEffect(() => {
    const datos = location.state?.nuevaOrdenPara
    if (!datos) return

    navigate(location.pathname, { replace: true, state: null })
    limpiarOrden()
    setComandaEnEdicion(null)
    setNombreCliente(datos.nombre || '')
    setTipoServicio(datos.tipoServicio === 'para-llevar' ? 'para-llevar' : 'comer-aqui')
    // Desde el plano de mesas llega la mesa elegida
    setMesaOrden(datos.idMesa ? { id: datos.idMesa, numero: datos.numeroMesa } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.nuevaOrdenPara])

  // El plano de mesas manda aquí la mesa lista para cobrar
  useEffect(() => {
    const idComanda = location.state?.cobrarComandaId
    if (!idComanda) return
    navigate(location.pathname, { replace: true, state: null })
    setCobrarPendiente(idComanda)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.cobrarComandaId])

  useEffect(() => {
    if (!cobrarPendiente || !terminadasCargadas) return
    const comanda = comandasTerminadasSinPagar.find((c) => c.id_comanda === cobrarPendiente)
    setCobrarPendiente(null)
    if (comanda) {
      setComandaEnEdicion(null)
      seleccionarComandaTerminada(comanda)
      subirPanelOrden()
    } else {
      Swal.fire({
        icon: 'info',
        title: 'La mesa ya no está para cobrar',
        text: 'Puede que ya se haya cobrado o que la cocina aún no termine.',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrarPendiente, terminadasCargadas, comandasTerminadasSinPagar])

  const addToCart = (product, tipoLecheSeleccionado = null, extrasSeleccionados = [], tipoProteinaSeleccionado = null, comentarioProducto = null) => {
    // Crear un ID único que incluya tipo de leche, extras, proteína y nota
    const tipoLecheHash = tipoLecheSeleccionado || 'none'
    const extrasHash = extrasSeleccionados && extrasSeleccionados.length > 0 
      ? extrasSeleccionados.sort().join(',') 
      : 'none'
    const tipoProteinaHash = tipoProteinaSeleccionado || 'none'
    const comentario = (comentarioProducto || '').trim() || null
    const comentarioHash = comentario || 'none'
    const uniqueId = `${product.id}-${tipoLecheHash}-${extrasHash}-${tipoProteinaHash}-${comentarioHash}`
    
    // Construir observaciones basadas en tipo de leche, extras, proteína y nota
    const observaciones = buildItemObservaciones({
      tipoLeche: tipoLecheSeleccionado,
      extras: extrasSeleccionados || [],
      tipoProteina: tipoProteinaSeleccionado,
      comentario,
    })
    
    const cartItem = {
      ...product,
      id: uniqueId,
      originalId: product.id,
      tipoLeche: tipoLecheSeleccionado,
      extras: extrasSeleccionados || [],
      tipoProteina: tipoProteinaSeleccionado,
      comentario,
      observaciones,
      quantity: 1
    }
    
    const existingItem = cart.find(item => 
      item.originalId === product.id && 
      item.tipoLeche === tipoLecheSeleccionado &&
      JSON.stringify(item.extras?.sort() || []) === JSON.stringify((extrasSeleccionados || []).sort()) &&
      item.tipoProteina === tipoProteinaSeleccionado &&
      (item.comentario || null) === comentario
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
  
  const abrirModalProducto = (product) => {
    const productId = product.id_producto
    if (productoExpandido === productId && !lineaEditandoId) {
      setProductoExpandido(null)
      return
    }
    setProductoExpandido(productId)
    if (!opcionesProductos[productId]) {
      setOpcionesProductos({
        ...opcionesProductos,
        [productId]: {
          tipoLeche: 'entera',
          extras: [],
          tipoProteina: null,
          comentario: '',
        },
      })
    }
  }

  const handleProductClick = (product) => {
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(product)
    const necesitaModal = llevaLeche || llevaExtras || llevaProteina || esProductoComida(product)

    // Bebidas sin opciones van directo al carrito; la comida siempre abre modal
    // aunque no tenga extras, para poder dejar nota a cocina.
    if (!necesitaModal) {
      addToCart({
        ...product,
        id: product.id_producto,
        name: product.nombre,
        price: product.precio,
      })
      return
    }

    setLineaEditandoId(null)
    abrirModalProducto(product)
  }

  const productoDeLinea = (item) =>
    productos.find((p) => p.id_producto === (item.originalId ?? item.id_producto))

  const lineaSePuedeEditar = (item) => {
    if (item.entregado || item.personalizado) return false
    const product = productoDeLinea(item)
    if (!product) return false
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(product)
    return llevaLeche || llevaExtras || llevaProteina || esProductoComida(product)
  }

  const editarLineaOrden = (item) => {
    const product = productoDeLinea(item)
    if (!product || !lineaSePuedeEditar(item)) return
    setLineaEditandoId(item.id)
    setProductoExpandido(product.id_producto)
    setOpcionesProductos((prev) => ({
      ...prev,
      [product.id_producto]: {
        tipoLeche: item.tipoLeche || 'entera',
        extras: item.extras || [],
        tipoProteina: item.tipoProteina || null,
        comentario: item.comentario || '',
      },
    }))
  }

  const cerrarModalOpcionesProducto = () => {
    if (productoExpandido) {
      setOpcionesProductos((prev) => ({
        ...prev,
        [productoExpandido]: {
          tipoLeche: 'entera',
          extras: [],
          tipoProteina: null,
          comentario: '',
        },
      }))
    }
    setLineaEditandoId(null)
    setProductoExpandido(null)
  }
  
  const confirmarAgregarAlCarrito = (product) => {
    const productId = product.id_producto
    const opciones = opcionesProductos[productId] || {
      tipoLeche: 'entera',
      extras: [],
      tipoProteina: null,
      comentario: '',
    }
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(product)
    
    const tipoLeche = llevaLeche ? opciones.tipoLeche : null
    const extras = llevaExtras ? opciones.extras : []
    const tipoProteina = llevaProteina ? opciones.tipoProteina : null
    const comentario = esProductoComida(product) ? opciones.comentario : null

    if (lineaEditandoId) {
      const linea = cart.find((item) => item.id === lineaEditandoId)
      const comentarioLimpio = (comentario || '').trim() || null
      const extrasOrdenados = [...(extras || [])].sort()
      const mismaFirma = (item) =>
        item.originalId === product.id_producto &&
        item.tipoLeche === tipoLeche &&
        JSON.stringify([...(item.extras || [])].sort()) === JSON.stringify(extrasOrdenados) &&
        item.tipoProteina === tipoProteina &&
        (item.comentario || null) === comentarioLimpio
      const observaciones = buildItemObservaciones({
        tipoLeche,
        extras,
        tipoProteina,
        comentario: comentarioLimpio,
      })
      const tipoLecheHash = tipoLeche || 'none'
      const extrasHash = extrasOrdenados.length ? extrasOrdenados.join(',') : 'none'
      const uniqueId = `${product.id_producto}-${tipoLecheHash}-${extrasHash}-${tipoProteina || 'none'}-${comentarioLimpio || 'none'}`
      const otra = linea && cart.find((item) => item.id !== linea.id && mismaFirma(item))

      if (!linea) {
        addToCart(
          { ...product, id: product.id_producto, name: product.nombre, price: product.precio },
          tipoLeche,
          extras,
          tipoProteina,
          comentario
        )
      } else if (otra) {
        setCart(
          cart
            .filter((item) => item.id !== linea.id)
            .map((item) =>
              item.id === otra.id
                ? { ...item, quantity: item.quantity + linea.quantity }
                : item
            )
        )
      } else {
        setCart(
          cart.map((item) =>
            item.id === linea.id
              ? {
                  ...item,
                  id: uniqueId,
                  originalId: product.id_producto,
                  tipoLeche,
                  extras,
                  tipoProteina,
                  comentario: comentarioLimpio,
                  observaciones,
                }
              : item
          )
        )
      }
    } else {
      addToCart(
        {
          ...product,
          id: product.id_producto,
          name: product.nombre,
          price: product.precio,
        },
        tipoLeche,
        extras,
        tipoProteina,
        comentario
      )
    }
    
    // Colapsar el panel y resetear opciones
    setLineaEditandoId(null)
    setProductoExpandido(null)
    setOpcionesProductos({
      ...opcionesProductos,
      [productId]: {
        tipoLeche: 'entera',
        extras: [],
        tipoProteina: null,
        comentario: '',
      },
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
    const siguiente = cart
      .map((item) => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
        }
        return item
      })
      .filter((item) => item.quantity > 0)
    setCart(siguiente)
    if (siguiente.length === 0) reiniciarSeleccionDeCobro()
  }

  const removeFromCart = (id) => {
    const siguiente = cart.filter((item) => item.id !== id)
    setCart(siguiente)
    if (siguiente.length === 0) reiniciarSeleccionDeCobro()
  }

  /** Al vaciar la orden no debe quedar método de pago ni ajustes de la anterior. */
  const reiniciarSeleccionDeCobro = () => {
    setMetodoPago(null)
    setMontoRecibido('')
    setTipoServicio('comer-aqui')
    removerPropina()
    removerDescuento()
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

  // Agrupar productos activos por categoría (orden del menú de la marca)
  const categories = sortMenuCategories(
    [...new Set(catalogo.filter((p) => p.activo).map((p) => p.categoria))]
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

    let texto = `${marca.encabezadoWhatsapp}\n`
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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
      confirmButtonColor: 'rgb(var(--marca-500))',
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
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    if (!metodoPago) {
      Swal.fire({
        icon: 'warning',
        title: 'Método de pago requerido',
        text: 'Por favor selecciona un método de pago',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    // Cada apertura del modal parte del estándar: comer aquí, salvo que el
    // método de pago sea Delivery (ahí el servicio ya está implícito).
    setTipoServicio(metodoPago === 'delivery' ? 'para-llevar' : 'comer-aqui')
    setMontoRecibido('')
    setMontoEfectivoPago('')
    setMontoTarjetaPago('')
    setMostrarModalFinalizar(true)
  }

  const alternarMetodoPago = (id) => {
    const combinable = id === 'efectivo' || id === 'tarjeta'
    if (!combinable) {
      setMetodoPago(id)
      return
    }
    if (metodoPago === 'mixto') {
      setMetodoPago(id === 'efectivo' ? 'tarjeta' : 'efectivo')
      return
    }
    if (
      (metodoPago === 'efectivo' && id === 'tarjeta') ||
      (metodoPago === 'tarjeta' && id === 'efectivo')
    ) {
      setMetodoPago('mixto')
      return
    }
    setMetodoPago(id)
  }

  const metodoSeleccionado = (id) =>
    metodoPago === id || (metodoPago === 'mixto' && (id === 'efectivo' || id === 'tarjeta'))

  const partesDelPago = (totalConPropina) => {
    if (metodoPago !== 'mixto') return { valido: true }
    const efectivo = parseFloat(montoEfectivoPago)
    const tarjeta = parseFloat(montoTarjetaPago)
    const suma = (Number.isFinite(efectivo) ? efectivo : 0) + (Number.isFinite(tarjeta) ? tarjeta : 0)
    const valido = efectivo > 0 && tarjeta > 0 && Math.abs(suma - totalConPropina) < 0.02
    return { valido, efectivo, tarjeta, faltan: totalConPropina - suma }
  }

  const asignarPartePago = (campo, valor, totalConPropina) => {
    const numero = parseFloat(valor)
    const resto = Number.isFinite(numero)
      ? Math.max(0, Math.round((totalConPropina - numero) * 100) / 100)
      : null
    const otro = resto == null ? '' : resto.toFixed(2)
    if (campo === 'efectivo') {
      setMontoEfectivoPago(valor)
      setMontoTarjetaPago(otro)
    } else {
      setMontoTarjetaPago(valor)
      setMontoEfectivoPago(otro)
    }
  }

  /**
   * Imprime la cuenta que se entrega al cliente cuando pide pagar.
   * A diferencia del recibo, no lleva método de pago y sugiere propina.
   * Si recibe una comanda la usa como origen; si no, usa la orden en pantalla.
   */
  const imprimirCuenta = async (comanda = null, division = null) => {
    const datos = datosCuenta(comanda)

    if (!datos.items.length) {
      await Swal.fire({
        icon: 'info',
        title: 'Sin productos',
        text: 'Agrega productos a la orden antes de imprimir la cuenta.',
      confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    const referencia = comanda || comandaTerminadaSeleccionada
    const ticket = {
      negocio: marca.nombreTicket,
      tipo: 'cuenta',
      numero: referencia?.id_venta ?? null,
      cajero: usuario ? `${usuario.nombre || ''} ${usuario.apellido_paterno || ''}`.trim() : null,
      comentarios: comanda ? null : comentarios || null,
      items: itemsDesdeCarrito(datos.items),
      subtotal: datos.subtotal,
      descuento: datos.descuento,
      propina: datos.propina,
      total: datos.total,
      division,
    }

    await enviarTicketAImpresora(
      ticket,
      division ? 'Cuentas impresas' : 'Cuenta impresa',
      division ? 'Entrega a cada quien su parte.' : 'Entrégala al cliente.'
    )
  }

  /** Productos y montos de la cuenta: de una comanda dada o de la orden en pantalla. */
  const datosCuenta = (comanda = null) => {
    const itemsOrden = comanda ? convertirComandaTerminadaACarrito(comanda) : cart
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

    return {
      items: itemsOrden,
      subtotal,
      descuento,
      propina,
      total: totalDespuesDescuento + propina,
      precioUnitario: (item) => {
        const extras = desglosarExtrasCarrito([{ ...item, quantity: 1 }])
        return precioItem(item) + extras.extraLeche + extras.extraExtras + extras.extraProteina
      },
    }
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
          confirmButtonColor: 'rgb(var(--marca-500))',
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
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
    }
  }

  const verificarCajaParaCobro = async () => {
    if ((metodoPago === 'efectivo' || metodoPago === 'mixto') && !estadoCaja?.abierta) {
      const result = await Swal.fire({
        title: 'Caja cerrada',
        text: 'No hay caja abierta. Debe abrir caja antes de cobrar en efectivo.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Ir a Caja',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: 'rgb(var(--marca-500))',
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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
    const totalConPropina = resumenOrden().totalFinal
    const partes = partesDelPago(totalConPropina)
    if (metodoPago === 'mixto' && !partes.valido) {
      await Swal.fire({
        icon: 'warning',
        title: 'Revisa el pago',
        text: 'Efectivo y tarjeta tienen que ser mayores a cero y sumar el total.',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }
    const cajaOk = await verificarCajaParaCobro()
    if (!cajaOk) return

    setProcesando(true)
    setMostrarModalFinalizar(false)
    // Se cobra exactamente la propina que se le mostró al cliente en el panel,
    // en lugar de recalcularla aquí y arriesgar que salgan dos cifras distintas.
    const propinaACobrar = resumenOrden().propina
    try {
      // Si es comanda lista para cobrar, solo procesar pago (no crear nueva venta) con propina, descuento y tipo servicio
      if (comandaTerminadaSeleccionada) {
        const bodyPago = {
          metodo_pago: metodoPago,
          monto_efectivo: metodoPago === 'mixto' ? partes.efectivo : undefined,
          monto_tarjeta: metodoPago === 'mixto' ? partes.tarjeta : undefined,
          tipo_servicio: tipoServicio || undefined,
          descuento_tipo: totalDescuento > 0 ? descuentoTipo : undefined,
          descuento_valor: totalDescuento > 0 ? descuentoValor : undefined,
          total_descuento: totalDescuento > 0 ? totalDescuento : undefined,
          autorizacion: autorizacionDescuento || undefined,
          propina_porcentaje: propinaACobrar > 0 && propinaPorcentajeNumerico != null ? propinaPorcentajeNumerico : undefined,
          propina_monto: propinaACobrar > 0 ? propinaACobrar : undefined,
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
        monto_efectivo: metodoPago === 'mixto' ? partes.efectivo : null,
        monto_tarjeta: metodoPago === 'mixto' ? partes.tarjeta : null,
        propina_monto: propinaACobrar > 0 ? propinaACobrar : null,
        tipo_servicio: tipoServicio,
        tipo_leche: null,
        comentarios: comentarios || null,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        detalles: detallesVenta,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : null,
        descuento_valor: totalDescuento > 0 ? descuentoValor : null,
        total_descuento: totalDescuento > 0 ? totalDescuento : null,
        autorizacion: autorizacionDescuento,
        id_mesa: mesaOrden ? mesaOrden.id : null,
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
          area: idProducto === null ? item.area || 'barra' : null,
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
      if (propinaPorcentaje && propinaACobrar > 0 && comandaResponse?.id_comanda && usuario?.id_usuario) {
        try {
          const { propinasService } = await import('../../application/services/propinasService')
          const ventaSinPropina = Math.max(0, totalConPropina - propinaACobrar)
          const propinas = metodoPago === 'mixto'
            ? [
                { metodo: 'efectivo', monto: Math.max(0, partes.efectivo - Math.min(partes.efectivo, ventaSinPropina)) },
                { metodo: 'tarjeta', monto: Math.max(0, propinaACobrar - Math.max(0, partes.efectivo - Math.min(partes.efectivo, ventaSinPropina))) },
              ]
            : [{ metodo: metodoPago, monto: propinaACobrar }]
          for (const parte of propinas) {
            if (parte.monto <= 0) continue
            await propinasService.registrarPropina({
              id_comanda: comandaResponse.id_comanda,
              monto_porcentaje: propinaPorcentajeNumerico,
              monto_dinero: parte.monto,
              metodo_pago: parte.metodo,
              id_usuario: usuario.id_usuario
            })
          }
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
      setMesaOrden(null)
      
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }
    const mesa = comandaEnEdicion ? null : mesaOrden
    const nombreParaEnviar = (nombreForzado ?? (mesa ? `Mesa ${mesa.numero}` : nombreCliente) ?? '').trim()
    // El modal pide el nombre y el tipo de servicio. Las notas van por producto
    // en el modal de opciones, no aquí. Una mesa del plano ya trae ambos.
    if (nombreForzado === null && !mesa && (!comandaEnEdicion || !nombreParaEnviar)) {
      // Modal propio en vez de un prompt de SweetAlert: en tablet necesitamos
      // controlar la posición sobre el teclado y que Cancelar sea confiable.
      // El tipo de servicio se reinicia al abrir, no arrastra la elección anterior.
      setTipoServicio('comer-aqui')
      setNombreClienteTemp(nombreParaEnviar)
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
        tipo_servicio: mesa ? 'comer-aqui' : tipoServicio,
        tipo_leche: null,
        comentarios: comentarios || null,
        extra_leche: extraLeche > 0 ? extraLeche : null,
        detalles: detallesVenta,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : null,
        descuento_valor: totalDescuento > 0 ? descuentoValor : null,
        total_descuento: totalDescuento > 0 ? totalDescuento : null,
        autorizacion: autorizacionDescuento,
        pagada: false,
        id_mesa: mesa ? mesa.id : null,
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
          area: idProducto === null ? item.area || 'barra' : null,
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
      setMesaOrden(null)
      if (mesa) {
        // La orden salió del plano: se regresa a él para atender la siguiente mesa
        navigate('/mesas')
        return
      }
      await cargarComandasTerminadasSinPagar()
    } catch (error) {
      console.error('Error al enviar sin pagar:', error)
      const errorMsg = extraerMensajeError(error, 'Error al enviar a comandas')
      // Otra persona abrió la mesa mientras se armaba la orden: se suelta la
      // mesa y la orden se queda para mandarla con otro nombre o a otra mesa.
      if (error?.response?.status === 409) {
        setMesaOrden(null)
        setNombreCliente('')
      }
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    } finally {
      setProcesando(false)
    }
  }

  // Procesar pago de comanda terminada sin pagar (con propina, descuento y tipo servicio si se indicaron)
  const procesarPagoComandaTerminada = async () => {
    if (!comandaTerminadaSeleccionada || !metodoPago) return
    const totalConPropina = resumenOrden().totalFinal
    const partes = partesDelPago(totalConPropina)
    if (metodoPago === 'mixto' && !partes.valido) {
      await Swal.fire({
        icon: 'warning',
        title: 'Revisa el pago',
        text: 'Efectivo y tarjeta tienen que ser mayores a cero y sumar el total.',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }
    const cajaOk = await verificarCajaParaCobro()
    if (!cajaOk) return
    setProcesando(true)
    const propinaACobrar = resumenOrden().propina
    try {
      const bodyPago = {
        metodo_pago: metodoPago,
        monto_efectivo: metodoPago === 'mixto' ? partes.efectivo : undefined,
        monto_tarjeta: metodoPago === 'mixto' ? partes.tarjeta : undefined,
        tipo_servicio: tipoServicio || undefined,
        descuento_tipo: totalDescuento > 0 ? descuentoTipo : undefined,
        descuento_valor: totalDescuento > 0 ? descuentoValor : undefined,
        total_descuento: totalDescuento > 0 ? totalDescuento : undefined,
        autorizacion: autorizacionDescuento || undefined,
        propina_porcentaje: propinaACobrar > 0 && propinaPorcentajeNumerico != null ? propinaPorcentajeNumerico : undefined,
        propina_monto: propinaACobrar > 0 ? propinaACobrar : undefined,
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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
   * Importe sobre el que se calcula la propina: lo que el cliente realmente va a
   * pagar, ya con el descuento aplicado. Si se calculara sobre el subtotal, un
   * 10% de propina cobraría de más en cada orden con descuento.
   */
  const baseParaPropina = () =>
    Math.max(0, calcularSubtotalConExtras() - totalDescuento)

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

    setPropinaPorcentaje(porcentaje)
    setMontoPropina((baseParaPropina() * porcentaje) / 100)
    setMostrarModalPropina(false)
  }

  // Cuánto quedaría de propina con lo que hay escrito, para mostrarlo antes de aplicar
  const calcularMontoPropinaPersonalizada = () => {
    const valor = parseFloat(propinaPersonalizada) || 0
    return tipoPropinaPersonalizada === 'porcentaje'
      ? (baseParaPropina() * valor) / 100
      : valor
  }

  // Función para aplicar propina personalizada
  const aplicarPropinaPersonalizada = () => {
    const valor = parseFloat(propinaPersonalizada)

    if (isNaN(valor) || valor < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Valor inválido',
        text: 'Por favor ingresa un valor válido',
        confirmButtonColor: 'rgb(var(--marca-500))',
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
          confirmButtonColor: 'rgb(var(--marca-500))',
        })
        return
      }
      monto = (baseParaPropina() * valor) / 100
    } else {
      monto = valor
    }

    setMontoPropina(monto)
    setPropinaPorcentaje('personalizado')
    setMostrarModalPropina(false)
  }

  // Función para agregar producto personalizado al carrito
  const abrirModalPersonalizado = () => {
    setNombreProductoPersonalizado('')
    setPrecioProductoPersonalizado('')
    setAreaProductoPersonalizado('barra')
    setMostrarModalPersonalizado(true)
  }

  const cerrarModalPersonalizado = () => {
    setMostrarModalPersonalizado(false)
    setNombreProductoPersonalizado('')
    setPrecioProductoPersonalizado('')
  }

  const agregarProductoPersonalizado = () => {
    const nombre = nombreProductoPersonalizado.trim()
    const precio = parseFloat(precioProductoPersonalizado)

    if (!nombre) {
      Swal.fire({
        icon: 'error',
        title: 'Nombre requerido',
        text: 'Por favor ingresa un nombre para el producto',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    if (isNaN(precio) || precio <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Precio inválido',
        text: 'Por favor ingresa un precio válido mayor a 0',
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }

    // Crear producto personalizado
    const productoPersonalizado = {
      id: `personalizado-${Date.now()}`, // ID único temporal para UI
      id_producto: null, // Enviar null al backend para productos personalizados
      nombre: nombre,
      precio: precio,
      area: areaProductoPersonalizado,
      personalizado: true // Marca para identificar productos personalizados
    }

    // Agregar al carrito
    addToCart(productoPersonalizado)
    cerrarModalPersonalizado()
  }

  // La propina por porcentaje se rehace cuando cambia el carrito o el descuento:
  // ambos mueven el importe a pagar, que es sobre el que se calcula.
  useEffect(() => {
    if (typeof propinaPorcentaje === 'number') {
      setMontoPropina((baseParaPropina() * propinaPorcentaje) / 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, propinaPorcentaje, totalDescuento])

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
      const { tipoLeche, extras, tipoProteina, tipoPreparacion, comentario } = parsearObservaciones(detalle.observaciones || '')
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
        comentario: comentario || null,
        area: detalle.area_preparacion || null,
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
    setMesaOrden(null)
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
    setMesaOrden(null)
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

  /** Deja el panel de Orden Actual completamente vacío, sin comanda ni ajustes de cobro. */
  const limpiarOrden = () => {
    setComandaTerminadaSeleccionada(null)
    setMesaOrden(null)
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
        confirmButtonColor: 'rgb(var(--marca-500))',
        timer: 2200,
      })
      } catch (error) {
      const detalle = error?.response?.data?.detail
        await Swal.fire({
        icon: 'error',
        title: 'No se pudo cancelar',
        text: typeof detalle === 'string' ? detalle : 'Intenta de nuevo.',
          confirmButtonColor: 'rgb(var(--marca-500))',
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
        confirmButtonColor: 'rgb(var(--marca-500))',
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
        area: idProducto === null ? item.area || 'barra' : null,
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
      if (veniaDeBarista) navigate('/barista')
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.message || 'No se pudo actualizar la comanda'
      await Swal.fire({
        icon: 'error',
        title: 'Error al guardar',
        text: errorMsg,
        confirmButtonColor: 'rgb(var(--marca-500))',
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
    catalogo.filter((p) => p.categoria === category && p.activo)

  const abrirCategoria = (category) => {
    setCategoriaActiva((prev) => (prev === category ? null : category))
    setProductoExpandido(null)
    setSearchTerm('')
  }

  const alternarVistaCatalogo = () => {
    setVerTodos((prev) => {
      const siguiente = !prev
      localStorage.setItem(CLAVE_VISTA_CATALOGO, siguiente ? 'todos' : 'categorias')
      return siguiente
    })
    setCategoriaActiva(null)
    setProductoExpandido(null)
  }

  // Filtrar productos según búsqueda (nombre, categoría, código o SKU)
  const productosFiltrados = catalogo.filter((producto) => {
    if (!producto.activo) return false
    const q = searchTerm.toLowerCase().trim()
    if (!q) return true
    return (
      producto.nombre?.toLowerCase().includes(q) ||
      producto.descripcion?.toLowerCase().includes(q) ||
      producto.categoria?.toLowerCase().includes(q) ||
      String(producto.codigo_barras || '').toLowerCase() === q ||
      String(producto.sku || '').toLowerCase() === q ||
      String(producto.codigo_barras || '').toLowerCase().includes(q) ||
      String(producto.sku || '').toLowerCase().includes(q)
    )
  })

  const pareceCodigoBarras = (texto) => {
    const t = (texto || '').trim()
    return t.length >= 4 && /^[0-9A-Za-z\-]+$/.test(t) && /\d/.test(t)
  }

  const agregarProductoEscaneado = (producto) => {
    handleProductClick(producto)
    setSearchTerm('')
    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const intentarAgregarPorCodigo = async (codigoRaw) => {
    const codigo = (codigoRaw || '').trim()
    if (!codigo) return false
    const local = catalogo.find(
      (p) =>
        p.activo &&
        (String(p.codigo_barras || '') === codigo || String(p.sku || '') === codigo),
    )
    if (local) {
      agregarProductoEscaneado(local)
      return true
    }
    try {
      const remoto = await productosService.buscarPorCodigo(codigo)
      if (remoto?.id_producto && productoDelModo(remoto, modoTienda)) {
        agregarProductoEscaneado(remoto)
        return true
      }
    } catch {
      /* no encontrado */
    }
    return false
  }

  const onBusquedaKeyDown = async (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const texto = searchTerm.trim()
    if (!texto) return

    if (pareceCodigoBarras(texto)) {
      const ok = await intentarAgregarPorCodigo(texto)
      if (!ok) {
        Swal.fire({
          icon: 'warning',
          title: 'Código no encontrado',
          text: texto,
          timer: 1600,
          showConfirmButton: false,
        })
        setSearchTerm('')
      }
      return
    }

    if (productosFiltrados.length === 1) {
      seleccionarProductoDesdeBusqueda(productosFiltrados[0])
    }
  }

  const productosMasVendidos = idsMasVendidos
    .map((id) => catalogo.find((p) => Number(p.id_producto) === Number(id) && (p.activo === 1 || p.activo === true)))
    .filter(Boolean)

  // Función para seleccionar producto desde búsqueda
  const seleccionarProductoDesdeBusqueda = (producto) => {
    const { llevaLeche, llevaExtras, llevaProteina } = opcionesDelProducto(producto)
    const necesitaModal = llevaLeche || llevaExtras || llevaProteina || esProductoComida(producto)

    if (!necesitaModal) {
      addToCart({
        ...producto,
        id: producto.id_producto,
        name: producto.nombre,
        price: producto.precio,
      })
      setSearchTerm('')
      return
    }

    abrirModalProducto(producto)
    setSearchTerm('')
    setHighlightedProduct(null)
  }

  // Cobro exacto pendiente (Ctrl+Enter): al abrir el modal, confirma solo
  useEffect(() => {
    if (!mostrarModalFinalizar || !cobroExactoPendienteRef.current) return
    cobroExactoPendienteRef.current = false
    if (!puedeCobrar(usuario?.rol) || cart.length === 0) return
    procesarVenta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostrarModalFinalizar])

  // Atajos de cobro rápido (modo tienda)
  useEffect(() => {
    if (!modoTienda) return undefined

    const enCampoTexto = (el) => {
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
    }

    const abrirCobroCon = (metodo) => {
      if (cart.length === 0) return
      setMetodoPago(metodo)
      setTipoServicio('para-llevar')
      setMontoRecibido('')
      setMontoEfectivoPago('')
      setMontoTarjetaPago('')
      setMostrarModalFinalizar(true)
    }

    const onKey = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select?.()
        return
      }

      if (e.key === 'Escape' && mostrarModalFinalizar) {
        e.preventDefault()
        cobroExactoPendienteRef.current = false
        setMostrarModalFinalizar(false)
        return
      }

      if (e.key === 'F4') {
        e.preventDefault()
        abrirCobroCon(metodoPago || 'efectivo')
        return
      }

      if (e.key === 'F5') {
        e.preventDefault()
        setMetodoPago('efectivo')
        return
      }
      if (e.key === 'F6') {
        e.preventDefault()
        setMetodoPago('tarjeta')
        return
      }
      if (e.key === 'F7') {
        e.preventDefault()
        setMetodoPago('transferencia')
        return
      }
      if (e.key === 'F9') {
        e.preventDefault()
        if (cart.length === 0) return
        const totalExacto = resumenOrden().totalFinal
        setMetodoPago('efectivo')
        setTipoServicio('para-llevar')
        setMontoRecibido(String(totalExacto.toFixed(2)))
        setMostrarModalFinalizar(true)
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (cart.length === 0 || !puedeCobrar(usuario?.rol)) return
        const totalExacto = resumenOrden().totalFinal
        setMetodoPago('efectivo')
        setTipoServicio('para-llevar')
        setMontoRecibido(String(totalExacto.toFixed(2)))
        if (mostrarModalFinalizar) {
          procesarVenta()
        } else {
          cobroExactoPendienteRef.current = true
          setMostrarModalFinalizar(true)
        }
        return
      }

      if (e.key === 'Enter' && mostrarModalFinalizar && metodoPago === 'efectivo' && !enCampoTexto(e.target)) {
        e.preventDefault()
        procesarVenta()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    modoTienda,
    cart.length,
    metodoPago,
    mostrarModalFinalizar,
    usuario?.rol,
  ])

  if (productosLoading || cajaLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
      </div>
    )
  }

  if (estadoCaja && estadoCaja.abierta === false) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
        <span className="ml-3 text-gray-600">Redirigiendo a abrir caja...</span>
      </div>
    )
  }


  const renderProductTile = (product) => {
    const isHighlighted = highlightedProduct === product.id_producto
    const isSelected = productoExpandido === product.id_producto
    const foto = posConFotos ? fotosPorId[product.id_producto] : null
    const precio = `$${parseFloat(product.precio).toFixed(2)}`

  return (
      <button
        key={product.id_producto}
        type="button"
        onClick={() => handleProductClick(product)}
        className={`relative overflow-hidden rounded-xl border-2 transition-all text-left active:scale-[0.98] ${
          posConFotos ? 'min-h-[132px] p-0' : 'min-h-[88px] p-3'
        } ${
          isHighlighted || isSelected
            ? 'border-marca-500 bg-marca-50'
            : 'border-gray-200 bg-white hover:border-marca-400'
        }`}
      >
        {posConFotos ? (
          <>
            {foto ? (
              <img
                src={foto}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-gray-100 pb-8 text-gray-400">
                <ImageIcon className="w-8 h-8" aria-hidden="true" />
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/55 px-2.5 py-2">
              <span className="block font-medium text-white text-sm leading-snug">{product.nombre}</span>
              <span className="block text-sm text-white font-semibold">{precio}</span>
            </span>
          </>
        ) : (
          <>
            <p className="font-medium text-gray-900 text-sm leading-snug">{product.nombre}</p>
            <p className="text-sm text-marca-600 font-semibold mt-1">{precio}</p>
          </>
        )}
      </button>
    )
  }

  const productoOpcionesModal = productoExpandido
    ? productos.find((p) => p.id_producto === productoExpandido)
    : null
  const opcionesModal = productoExpandido
    ? (opcionesProductos[productoExpandido] || {
        tipoLeche: 'entera',
        extras: [],
        tipoProteina: null,
        comentario: '',
      })
    : null
  const opcionesDelModal = opcionesDelProducto(productoOpcionesModal)
  const modalLlevaLeche = opcionesDelModal.llevaLeche
  const modalLlevaExtras = opcionesDelModal.llevaExtras
  const modalLlevaProteina = opcionesDelModal.llevaProteina
  const modalEsComida = esProductoComida(productoOpcionesModal)
  // Cada grupo asignado al producto se pinta como una sección propia ("Extras",
  // "Agrega Power", "Toppings"). Sin grupos cargados se cae a la lista completa.
  const gruposDelModal = opcionesDelModal.grupos.length
    ? opcionesDelModal.grupos
    : modalLlevaExtras
      ? [{ clave: 'extras', nombre: 'Extras', seleccion: 'multiple', opciones: getExtrasDisponibles() }]
      : []
  const piezasOrden = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  const totalBarraOrden = resumenOrden().totalFinal
  const mesasAbiertas = (modoRestaurante && puedeCobrar(usuario?.rol))
    ? comandasTerminadasSinPagar.length
    : 0

  return (
    <div className="relative h-full min-h-0 pt-3 px-2 pb-2 flex flex-col landscape:flex-row gap-2 overflow-hidden">
      {/* Catálogo */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-2 overflow-hidden">
        {/* Barra superior: solo buscador */}
        <div className="shrink-0 flex gap-2 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={modoTienda ? 'Buscar o escanear código…' : 'Buscar...'}
              className={`input pl-8 w-full py-2.5 text-sm ${searchTerm ? 'pr-12' : ''}`}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value) setCategoriaActiva(null)
              }}
              onKeyDown={onBusquedaKeyDown}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                aria-label="Borrar búsqueda"
                className="group absolute inset-y-0 right-0 flex w-11 items-center justify-center"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-600 transition-colors group-hover:bg-red-500/20 group-active:bg-red-500/25">
                  <X className="w-4 h-4" />
                </span>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => guardarPosConFotos(!posConFotos)}
            title={posConFotos ? 'Ocultar fotos' : 'Ver fotos'}
            aria-label={posConFotos ? 'Ocultar fotos' : 'Ver fotos'}
            aria-pressed={posConFotos}
            className={`shrink-0 flex h-[42px] w-[42px] items-center justify-center rounded-lg border bg-white hover:border-marca-400 hover:text-marca-700 ${
              posConFotos
                ? 'border-marca-500 text-marca-700'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            {posConFotos ? <ImageIcon className="w-5 h-5" /> : <ImageOff className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={alternarVistaCatalogo}
            title={verTodos ? 'Ver por categorías' : 'Ver todos'}
            aria-label={verTodos ? 'Ver por categorías' : 'Ver todos'}
            className="shrink-0 flex h-[42px] w-[42px] items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-marca-400 hover:text-marca-700"
          >
            {verTodos ? <Folder className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
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
          ) : verTodos ? (
            <div className="space-y-3">
              {productosMasVendidos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">
                    Más vendidos
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                    {productosMasVendidos.map((product) => renderProductTile(product))}
                  </div>
                </div>
              )}
            <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
              <button
                type="button"
                onClick={abrirModalPersonalizado}
                className="min-h-[88px] rounded-xl border-2 border-gray-200 bg-gray-50 hover:border-marca-500 hover:bg-marca-50 active:scale-[0.98] transition-all p-3 flex flex-col items-center justify-center text-center"
              >
                <span className="font-semibold text-gray-900 text-sm leading-tight">
                  Personalizado
                </span>
              </button>
              {catalogo.filter((p) => p.activo).map((product) => renderProductTile(product))}
            </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* En celular las categorías van en una fila deslizable; desde sm, en cuadrícula */}
              <div className="sin-barra-scroll -mx-2 flex gap-2 overflow-x-auto px-2 sm:mx-0 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] sm:overflow-visible sm:px-0">
                <button
                  type="button"
                  onClick={abrirModalPersonalizado}
                  className="shrink-0 whitespace-nowrap rounded-xl border-2 border-gray-200 bg-gray-50 active:scale-[0.98] transition-transform px-3 py-2 flex flex-col items-center justify-center text-center sm:min-h-[64px] sm:whitespace-normal sm:p-2"
                >
                  <span className="font-semibold text-gray-900 text-sm leading-tight">
                    Personalizado
                  </span>
                </button>
                {categories.map((category) => {
                  const activa = categoriaActiva === category
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={(event) => {
                        abrirCategoria(category)
                        event.currentTarget.blur()
                      }}
                      aria-pressed={activa}
                      className={`shrink-0 whitespace-nowrap rounded-xl border-2 active:scale-[0.98] transition-transform px-3 py-2 flex flex-col items-center justify-center text-center sm:min-h-[64px] sm:whitespace-normal sm:p-2 ${
                        activa
                          ? 'border-marca-500 bg-marca-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <span className="font-semibold text-gray-900 text-sm leading-tight">{category}</span>
                    </button>
                  )
                })}
              </div>
              {categoriaActiva ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">
                    {categoriaActiva}
                  </p>
                  {productosDeCategoria(categoriaActiva).length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-400">Sin productos en esta categoría</p>
                  ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                      {productosDeCategoria(categoriaActiva).map((product) => renderProductTile(product))}
                    </div>
                  )}
                </div>
              ) : productosMasVendidos.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5 px-0.5">
                    Más vendidos
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2">
                    {productosMasVendidos.map((product) => renderProductTile(product))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
                        </div>
        </div>

        {!ordenDesplegada && (
          <button
            type="button"
            onClick={() => setOrdenDesplegada(true)}
            className="landscape:hidden shrink-0 flex w-full items-center gap-3 rounded-2xl bg-oscuro-800 px-4 py-3 text-left text-white shadow-lg"
          >
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-white/15 px-2 text-sm font-semibold">
              {piezasOrden}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">
                {piezasOrden === 0
                  ? 'Ver orden'
                  : `${piezasOrden} ${piezasOrden === 1 ? 'producto' : 'productos'}`}
              </span>
              {mesasAbiertas > 0 && (
                <span className="block text-xs text-white/70">
                  {mesasAbiertas} {mesasAbiertas === 1 ? 'mesa abierta' : 'mesas abiertas'}
                </span>
              )}
            </span>
            <span className="text-base font-bold tabular-nums">${totalBarraOrden.toFixed(2)}</span>
            <ChevronUp className="w-5 h-5 shrink-0 text-white/80" aria-hidden="true" />
          </button>
        )}

        {/* Ticket / orden. En vertical queda detrás de la tarjeta de abajo. */}
        <div
          ref={panelOrdenRef}
          className={`min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain bg-gray-50 p-2 landscape:static landscape:inset-auto landscape:z-auto landscape:flex landscape:w-[340px] landscape:max-w-[360px] landscape:shrink-0 landscape:bg-transparent landscape:p-0 lg:landscape:w-[360px] ${
            ordenDesplegada
              ? 'absolute inset-0 z-20 flex'
              : 'hidden'
          }`}
        >
          <div className="landscape:hidden sticky top-0 z-10 -mx-2 -mt-2 mb-1 flex items-center justify-between bg-gray-50 px-3 py-2">
            <p className="text-base font-semibold text-gray-900">Tu orden</p>
            <button
              type="button"
              onClick={() => setOrdenDesplegada(false)}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-marca-700"
            >
              Ocultar
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          {/* Orden actual (incluye la comanda de una mesa abierta lista para cobrar) */}
            <div className="card shrink-0 !p-3">
            
              <>
                {/* Vista de Carrito Normal (incluye comanda lista para cobrar) */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-marca-600" />
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
                    {mesaOrden && !comandaEnEdicion && !comandaTerminadaSeleccionada && (
                      <span className="inline-flex items-center gap-1 bg-marca-100 text-marca-700 text-xs font-medium pl-2 pr-1 py-0.5 rounded-full">
                        Mesa {mesaOrden.numero}
                        <button
                          type="button"
                          onClick={() => {
                            setMesaOrden(null)
                            setNombreCliente('')
                          }}
                          className="p-0.5 rounded-full hover:bg-marca-200"
                          title="Quitar mesa"
                          aria-label="Quitar mesa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                    {comandaTerminadaSeleccionada && (
                      <span className="bg-marca-100 text-marca-700 text-xs font-medium px-2 py-1 rounded-full">
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
                    {modoRestaurante && (
                      <>
                    <button
                        onClick={() => setMostrarModalPropina(true)}
                        disabled={ordenVacia}
                        className={claseIconoOrden(propinaPorcentaje, 'text-marca-600 bg-marca-50')}
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
                      </>
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
                    const detalles = [
                      item.size && { texto: item.size, color: 'text-marca-700' },
                      item.tipoPreparacion && (item.tipoPreparacion === 'heladas'
                        ? { texto: 'Frío', color: 'text-blue-700' }
                        : { texto: 'Frapeada', color: 'text-amber-700' }),
                      item.tipoProteina && { texto: getNombreProteina(item.tipoProteina), color: 'text-amber-700' },
                      tipoLecheNombre && { texto: `Leche: ${tipoLecheNombre}`, color: 'text-blue-700' },
                      ...extrasNombres.map((nombre) => ({ texto: nombre, color: 'text-purple-700' })),
                    ].filter(Boolean)
                    // Lo que ya se entregó al cliente no se toca, ni editando la
                    // comanda ni cobrándola: el backend cobra el total guardado,
                    // así que cambiarlo aquí solo desajustaría lo que se ve.
                    const bloqueado = Boolean(item.entregado)
                    const puedeEditar = lineaSePuedeEditar(item)
                    const detalleLinea = (
                      <>
                          <p className={`font-medium text-sm leading-tight ${bloqueado ? 'text-gray-500' : 'text-gray-900'}`}>
                            {item.nombre || item.name}
                          </p>
                          
                          {detalles.length > 0 && (
                            <p className="mt-1 text-xs font-medium leading-snug">
                              {detalles.map((d, i) => (
                                <span key={i}>
                                  {i > 0 && <span className="text-gray-400"> • </span>}
                                  <span className={d.color}>{d.texto}</span>
                                </span>
                              ))}
                            </p>
                          )}
                          {item.comentario && (
                            <p className="mt-1 text-xs text-amber-800 italic leading-snug">
                              {item.comentario}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 leading-tight">
                            ${precioItem(item).toFixed(2)} c/u
                          </p>
                      </>
                    )
                    
                    return (
                      <div
                        key={item.id}
                        className={`flex items-start justify-between p-3 rounded-lg ${
                          bloqueado ? 'bg-gray-100 border border-dashed border-gray-300' : 'bg-gray-50'
                        }`}
                      >
                        {puedeEditar ? (
                          <button
                            type="button"
                            onClick={() => editarLineaOrden(item)}
                            className="flex-1 min-w-0 text-left"
                            title="Editar nota, extras o leche"
                          >
                            {detalleLinea}
                          </button>
                        ) : (
                          <div className="flex-1">{detalleLinea}</div>
                        )}
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
                  {/* Los totales salen de resumenOrden, que es el mismo cálculo
                      que se cobra y que se imprime en la cuenta. */}
                  {(() => {
                    const subtotal = cart.reduce((sum, item) => sum + precioItem(item) * (Number(item.quantity) || 0), 0)
                    const {
                      extraLeche, extraExtras, extraProteina,
                      descuento: descuentoActual,
                      propina: montoPropinaActual,
                      propinaLabel,
                      totalFinal,
                    } = resumenOrden()
                    
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
                    <span className="text-2xl font-bold text-marca-600">
                              ${Number(totalFinal).toFixed(2)}
                    </span>
                  </div>
                        </div>
                      </>
                    )
                  })()}

                  {/* La cuenta solo se imprime con una mesa abierta cargada y sin productos
                      nuevos pendientes de enviar a cocina. */}
                  {comandaTerminadaSeleccionada && !hayItemsNuevos && (
                  <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => imprimirCuenta()}
                    className="py-3 text-base border-2 border-gray-600 text-gray-700 bg-white hover:bg-gray-100 active:scale-[0.98] transition-all rounded-lg font-semibold"
                    title="Imprime la cuenta para entregarla al cliente (no cobra la orden)"
                  >
                    Imprimir Cuenta
                  </button>
                  <button
                    onClick={() => setMostrarDividirCuenta(true)}
                    disabled={!cart.length}
                    className="py-3 text-base border-2 border-gray-600 text-gray-700 bg-white hover:bg-gray-100 active:scale-[0.98] transition-all rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Imprime la cuenta dividida entre varias personas"
                  >
                    Dividir Cuenta
                  </button>
                  </div>
                  )}

                  {/* Mesa abierta con productos nuevos: primero van a cocina, no a caja.
                      Cobrar antes de guardarlos usaría el total viejo de la venta. */}
                  {modoRestaurante && (comandaEnEdicion || (comandaTerminadaSeleccionada && hayItemsNuevos)) ? (
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
                  {modoRestaurante && !comandaTerminadaSeleccionada && (
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
                  <div className="flex gap-2">
                    {metodosPagoActivos.filter((metodo) => !modoTienda || metodo.id !== 'delivery').map((metodo) => {
                      const Icono = ICONOS_METODO_PAGO[metodo.icono] || Banknote
                      return (
                        <button
                          key={metodo.id}
                          type="button"
                          onClick={() => alternarMetodoPago(metodo.id)}
                          className={claseMetodoPago(metodo.id, metodoSeleccionado(metodo.id))}
                          title={metodo.label}
                          aria-label={metodo.label}
                          aria-pressed={metodoSeleccionado(metodo.id)}
                        >
                          <Icono className="w-6 h-6" />
                        </button>
                      )
                    })}
                    </div>
                  {(metodoPago === 'efectivo' || metodoPago === 'tarjeta') && (
                    <p className="text-xs text-center text-gray-500">Toca el otro para dividir el pago</p>
                  )}
                  {metodoPago === 'mixto' && (
                    <p className="text-xs text-center text-gray-500">Pago dividido entre efectivo y tarjeta</p>
                  )}
                  <button
                    onClick={abrirModalFinalizar}
                    disabled={!metodoPago || procesando || ventaLoading || comandaLoading}
                    className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    title={!metodoPago ? 'Selecciona un método de pago' : undefined}
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

          {/* Mesas abiertas: ya se entregó lo pedido pero la cuenta sigue viva.
              El mesero no cobra; él sigue sus mesas desde el plano. */}
          {modoRestaurante && comandasTerminadasSinPagar.length > 0 && puedeCobrar(usuario?.rol) && (
            <div className="card mb-2 !p-3">
              <button
                type="button"
                onClick={alternarMesasAbiertas}
                aria-expanded={mesasDesplegadas}
                className={`flex w-full items-center gap-2 text-left ${mesasDesplegadas ? 'mb-2' : ''}`}
              >
                <CheckCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <h2 className="flex-1 text-base font-semibold text-gray-900">Mesas abiertas</h2>
                <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                  {comandasTerminadasSinPagar.length}
                </span>
                {mesasDesplegadas ? (
                  <ChevronUp className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" aria-hidden="true" />
                )}
              </button>
              {mesasDesplegadas && (
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
                      <div className="mt-2">
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800">
                          Sin pagar
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              )}
            </div>
              )}
            </div>

      {/* Modal producto personalizado */}
      {mostrarModalPersonalizado && (
        <div className={OVERLAY_MODAL} onClick={cerrarModalPersonalizado}>
          <div
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <form
              className="p-4 space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                agregarProductoPersonalizado()
              }}
            >
              <div>
                <label className="campo-label">
                  Nombre del producto
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nombreProductoPersonalizado}
                  onChange={(e) => setNombreProductoPersonalizado(e.target.value)}
                  placeholder="Ej: Extra shot, postre del día"
                  className="campo"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="campo-label">
                  Precio
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={precioProductoPersonalizado}
                    onChange={(e) => setPrecioProductoPersonalizado(e.target.value)}
                    placeholder="0.00"
                    className="campo pl-7"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="campo-label">
                  ¿Dónde se prepara?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'cocina', texto: 'Cocina' },
                    { id: 'barra', texto: 'Barra' },
                  ].map(({ id, texto }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAreaProductoPersonalizado(id)}
                      className={`w-full min-w-0 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-colors inline-flex items-center justify-center ${
                        areaProductoPersonalizado === id
                          ? 'border-marca-500 bg-marca-50 text-marca-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {texto}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={cerrarModalPersonalizado}
                  className="w-full min-w-0 py-2.5 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreProductoPersonalizado.trim() || !precioProductoPersonalizado}
                  className="btn-primary w-full min-w-0 py-2.5 border-2 border-transparent disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal opciones de producto (leche / extras / proteína) */}
      {productoOpcionesModal && opcionesModal && (
        <div
          className={OVERLAY_MODAL}
          onClick={cerrarModalOpcionesProducto}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              <div className="min-w-0 pr-2">
                <h2 className="text-xl font-bold text-gray-900 truncate">{productoOpcionesModal.nombre}</h2>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {getLechesDisponibles().map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => actualizarTipoLeche(productoOpcionesModal.id_producto, opt.value)}
                        className={`min-h-[52px] px-4 py-3 rounded-xl border-2 text-left text-base font-medium transition-all ${
                          opcionesModal.tipoLeche === opt.value
                            ? 'border-marca-500 bg-marca-50 text-marca-800'
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
                    <p className="text-sm font-medium text-gray-700 mb-2">{grupo.nombre}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
                                ? 'border-marca-500 bg-marca-50 text-marca-800'
                                : 'border-gray-200 text-gray-800'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 shrink-0 border-2 flex items-center justify-center ${
                                eligeUna ? 'rounded-full' : 'rounded'
                              } ${activo ? 'border-marca-600' : 'border-gray-300'}`}
                            >
                              {activo &&
                                (eligeUna ? (
                                  <span className="w-2.5 h-2.5 rounded-full bg-marca-600" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-marca-600" strokeWidth={3} />
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
                        ? 'border-marca-500 bg-marca-50 text-marca-800'
                        : 'border-gray-200 text-gray-800'
                    }`}
                  >
                    Scoop proteína (+${PROTEINA_SCOOP_PRECIO})
                  </button>
                </div>
              )}

              {modalEsComida && (
                <div>
                  <label className="campo-label">
                    Nota para cocina
                  </label>
                  <textarea
                    value={opcionesModal.comentario || ''}
                    onChange={(e) =>
                      setOpcionesProductos((prev) => ({
                        ...prev,
                        [productoOpcionesModal.id_producto]: {
                          ...(prev[productoOpcionesModal.id_producto] || {}),
                          comentario: e.target.value,
                        },
                      }))
                    }
                    rows={2}
                    placeholder="Sin cebolla, poco picante, etc."
                    className="campo resize-none text-base"
                  />
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
                {lineaEditandoId ? 'Guardar' : 'Agregar'} · ${calcPrecioOpcionesProducto(productoOpcionesModal.precio, opcionesModal).toFixed(2)}
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
                <label className="campo-label">
                  Nombre del cliente
                </label>
                <input
                  type="text"
                  autoFocus
                  value={nombreClienteTemp}
                  onChange={(e) => setNombreClienteTemp(e.target.value)}
                  placeholder="Con qué nombre identificamos la mesa"
                  className="campo"
                />
              </div>
              {modoRestaurante && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { valor: 'comer-aqui', texto: 'Comer aquí', Icono: Utensils },
                  { valor: 'para-llevar', texto: 'Para llevar', Icono: ShoppingBag },
                ].map(({ valor, texto, Icono }) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => setTipoServicio(valor)}
                    className={`w-full min-w-0 py-3 px-3 rounded-lg border-2 text-sm transition-all inline-flex items-center justify-center gap-2 ${
                      tipoServicio === valor
                        ? 'border-marca-500 bg-marca-50 text-marca-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icono className="w-4 h-4" />
                    {texto}
                  </button>
                ))}
              </div>
              )}
              <div className="grid grid-cols-2 gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setMostrarModalNombreCliente(false)}
                  className="w-full min-w-0 py-2.5 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50 hover:border-red-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombreClienteTemp.trim() || procesando}
                  className="btn-primary w-full min-w-0 py-2.5 border-2 border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Finalizar Pedido */}
      {mostrarDividirCuenta && (
        <DividirCuentaModal
          cuenta={datosCuenta()}
          onClose={() => setMostrarDividirCuenta(false)}
          onImprimir={async (division) => {
            setMostrarDividirCuenta(false)
            await imprimirCuenta(null, division)
          }}
        />
      )}

      {mostrarModalFinalizar && (
        <div
          className={OVERLAY_MODAL}
          onClick={() => setMostrarModalFinalizar(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md md:max-w-2xl w-full max-h-[90vh] overflow-y-auto"
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
                    className="px-4 py-2 bg-marca-600 hover:bg-marca-700 text-white rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Enviar ticket
                  </button>
                </div>
              </div>
              */}

              {/* Cuando el cliente paga de una vez, la orden nunca pasó por el
                  modal de comandas y este es el único lugar donde dar el nombre. */}
              <div className="grid grid-cols-1 md:grid-cols-2 md:items-end gap-5 md:gap-4 empty:hidden">
              {!comandaEnEdicion && !comandaTerminadaSeleccionada && (
              <div>
                  <label className="campo-label">
                    Nombre del cliente <span className="text-[#8e8e93]">(Opcional)</span>
                </label>
                  <input
                    type="text"
                    value={nombreCliente}
                    onChange={(e) => setNombreCliente(e.target.value)}
                    placeholder="Para identificar la comanda"
                    className="campo"
                />
              </div>
              )}

              {/* En efectivo/tarjeta hay que preguntar; con método Delivery ya se sabe. */}
              {modoRestaurante && metodoPago !== 'delivery' && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { valor: 'comer-aqui', texto: 'Comer aquí', Icono: Utensils },
                    { valor: 'para-llevar', texto: 'Para llevar', Icono: ShoppingBag },
                  ].map(({ valor, texto, Icono }) => (
                    <button
                      key={valor}
                      type="button"
                      onClick={() => setTipoServicio(valor)}
                      className={`py-2.5 px-3 rounded-lg border-2 text-sm transition-all inline-flex items-center justify-center gap-2 ${
                        tipoServicio === valor
                          ? 'border-marca-500 bg-marca-50 text-marca-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icono className="w-4 h-4" />
                      {texto}
                    </button>
                  ))}
                </div>
              )}
              </div>

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
                        <span className="text-marca-600">
                          ${resumen.totalFinal.toFixed(2)}
                        </span>
                      </div>
                    </>
                  )
                })()}
              </div>

              {metodoPago === 'mixto' && (() => {
                const totalACobrar = resumenOrden().totalFinal
                const partes = partesDelPago(totalACobrar)
                return (
                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <p className="text-sm font-medium text-gray-700">Dividir el pago</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <label className="campo-label">Efectivo</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={montoEfectivoPago}
                          onChange={(e) => asignarPartePago('efectivo', e.target.value, totalACobrar)}
                          className="campo min-w-0"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="campo-label">Tarjeta</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          value={montoTarjetaPago}
                          onChange={(e) => asignarPartePago('tarjeta', e.target.value, totalACobrar)}
                          className="campo min-w-0"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${partes.valido ? 'text-marca-700' : 'text-red-600'}`}>
                      {partes.valido
                        ? 'Las dos partes suman el total'
                        : Math.abs(partes.faltan || 0) < 0.02
                          ? 'Cada parte tiene que ser mayor a cero'
                          : partes.faltan < -0.02
                            ? `Sobran $${Math.abs(partes.faltan).toFixed(2)}`
                            : `Faltan $${Math.abs(partes.faltan || totalACobrar).toFixed(2)} para completar el total`}
                    </p>
                  </div>
                )
              })()}

              {/* Cambio: solo tiene sentido cuando el cliente paga con billetes */}
              {(metodoPago === 'efectivo' || metodoPago === 'mixto') && (() => {
                const totalACobrar = metodoPago === 'mixto'
                  ? (parseFloat(montoEfectivoPago) || 0)
                  : resumenOrden().totalFinal
                const recibido = parseFloat(montoRecibido)
                const cambio = Number.isFinite(recibido) ? recibido - totalACobrar : null
                return (
                  <div className="border-t border-gray-200 pt-4 space-y-2">
                    <label className="campo-label">
                      {metodoPago === 'mixto' ? 'Paga en efectivo' : 'Paga con'}{' '}
                      <span className="text-[#8e8e93]">(Opcional)</span>
                    </label>
                    <BilletesEfectivo
                      total={totalACobrar}
                      montoRecibido={montoRecibido}
                      onChange={setMontoRecibido}
                    />
                <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      placeholder={`Ej: ${Math.ceil(totalACobrar / 50) * 50}`}
                      value={montoRecibido}
                      onChange={(e) => setMontoRecibido(e.target.value)}
                  className="campo"
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
                disabled={procesando || ventaLoading || comandaLoading || !metodoPago || (metodoPago === 'mixto' && !partesDelPago(resumenOrden().totalFinal).valido)}
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
      {modoRestaurante && mostrarModalPropina && (
        <div
          className={OVERLAY_MODAL}
          onClick={() => setMostrarModalPropina(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md md:max-w-2xl w-full"
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
              
              {/* Opciones de propina predefinidas */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={() => seleccionarPropina(10)}
                  className={`py-4 px-4 rounded-lg border-2 transition-all text-center ${
                    propinaPorcentaje === 10
                      ? 'border-marca-500 bg-marca-50'
                      : 'border-gray-200 hover:border-marca-500 hover:bg-marca-50'
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
                      ? 'border-marca-500 bg-marca-50'
                      : 'border-gray-200 hover:border-marca-500 hover:bg-marca-50'
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
                      ? 'border-marca-500 bg-marca-50'
                      : 'border-gray-200 hover:border-marca-500 hover:bg-marca-50'
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
                  <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  {/* Selector de tipo */}
                  <div className="flex gap-2 md:flex-1">
                    <button
                      onClick={() => setTipoPropinaPersonalizada('porcentaje')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                        tipoPropinaPersonalizada === 'porcentaje'
                          ? 'border-marca-500 bg-marca-50 text-marca-700'
                          : 'border-gray-200 hover:border-marca-500'
                      }`}
                    >
                      Porcentaje (%)
                    </button>
                    <button
                      onClick={() => setTipoPropinaPersonalizada('monto')}
                      className={`flex-1 py-2 px-3 rounded-lg border-2 transition-all text-sm ${
                        tipoPropinaPersonalizada === 'monto'
                          ? 'border-marca-500 bg-marca-50 text-marca-700'
                          : 'border-gray-200 hover:border-marca-500'
                      }`}
                    >
                      Monto fijo ($)
                    </button>
                  </div>

                  {/* Input para valor personalizado */}
                  <div className="flex gap-2 md:flex-1">
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        value={propinaPersonalizada}
                        onChange={(e) => setPropinaPersonalizada(e.target.value)}
                        placeholder={tipoPropinaPersonalizada === 'porcentaje' ? 'Ej: 12' : 'Ej: 25.00'}
                        className="campo pr-12"
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

                  {/* Sin esto no hay forma de notar que un 18.9 escrito en modo
                      porcentaje no son $18.90 sino el 18.9% de la cuenta. */}
                  {parseFloat(propinaPersonalizada) > 0 && (
                    <p className="text-sm text-gray-600 text-center">
                      Se agregarán{' '}
                      <span className="font-semibold text-gray-900">
                        ${calcularMontoPropinaPersonalizada().toFixed(2)}
                      </span>
                      {tipoPropinaPersonalizada === 'porcentaje' &&
                        ` (${propinaPersonalizada}% de $${baseParaPropina().toFixed(2)})`}
                    </p>
                  )}

                  
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
            className="bg-white rounded-lg shadow-xl max-w-md md:max-w-2xl w-full"
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
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
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
                <div className="flex flex-col md:flex-row gap-3">
                <div className="flex gap-2 md:flex-1">
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
                <div className="flex gap-2 md:flex-1">
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      value={descuentoPersonalizado}
                      onChange={(e) => setDescuentoPersonalizado(e.target.value)}
                      placeholder={tipoDescuentoPersonalizado === 'porcentaje' ? 'Ej: 12' : 'Ej: 50.00'}
                      className="campo pr-12"
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


