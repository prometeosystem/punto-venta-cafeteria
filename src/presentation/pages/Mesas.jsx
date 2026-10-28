import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, Plus, Save, X, Loader2, Trash2, Clock, Receipt, UtensilsCrossed, Printer } from 'lucide-react'
import Swal from 'sweetalert2'
import { mesaService } from '../../application/services/mesaService'
import { comandasService } from '../../application/services/comandasService'
import { claveBase } from '../utils/almacenLocal'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { isAdmin, puedeCobrar } from '../utils/rolePermissions'
import DibujoMesa from '../components/DibujoMesa'
import DividirCuentaModal from '../components/DividirCuentaModal'
import { CAPACIDADES, estadoDeMesa, formaMesa } from '../utils/mesasPlano'

// El plano mide 680 x 425 unidades, las mismas del dibujo de cada mesa, así
// todas se escalan igual. Las posiciones se guardan en % del centro de la mesa.
const ANCHO_PLANO = 680
const ALTO_PLANO = 425

// Modal arriba: en tablet el teclado tapa la mitad de abajo.
const OVERLAY_MODAL =
  'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center p-4 overflow-y-auto'

const ESTADOS = [
  { id: 'libre', texto: 'Libre', punto: 'bg-white border border-gray-300' },
  { id: 'cocina', texto: 'En cocina', punto: 'bg-marca-300' },
  { id: 'cobrar', texto: 'Para cobrar', punto: 'bg-amber-300' },
]

const ETIQUETA_ESTADO = {
  cocina: 'bg-marca-100 text-marca-700',
  cobrar: 'bg-amber-100 text-amber-700',
}

const NOMBRE_TIPO = {
  1: 'Individual',
  2: 'Para 2',
  3: 'Redonda de 3',
  4: 'Para 4',
  5: 'Redonda de 5',
  6: 'Para 6',
}

const dinero = (n) => `$${Number(n || 0).toFixed(2)}`

const minutosDesde = (iso) => {
  if (!iso) return null
  const ms = Date.now() - new Date(iso).getTime()
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 60000)) : null
}

const textoTiempo = (min) => {
  if (min == null) return ''
  if (min < 60) return `${min} min`
  return `${Math.floor(min / 60)} h ${min % 60} min`
}

// Verde hasta 10 min, ámbar hasta 20 y rojo después: es la espera de la comida, no la de la mesa.
const colorEsperaComida = (min) => {
  if (min >= 20) return 'bg-red-100 text-red-700'
  if (min >= 10) return 'bg-amber-100 text-amber-800'
  return 'bg-verde-100 text-verde-700'
}

const CLAVE_SECCION = claveBase('mesas-seccion')

// Medio ancho y medio alto de la mesa en % del plano, para que no se salga al arrastrar
const mitades = (capacidad) => {
  const { w, h } = formaMesa(capacidad)
  return { x: (w / ANCHO_PLANO) * 50, y: (h / ALTO_PLANO) * 50 }
}

const limitar = (valor, min, max) => Math.min(max, Math.max(min, valor))

// Dejar presionada una mesa este tiempo abre su edición (en el plano o fuera de él)
const DURACION_PRESION_MS = 500
// Recorrido horizontal mínimo para cambiar de sección deslizando
const DESLIZ_MIN_PX = 60

const extraerError = (error, porDefecto) =>
  error?.response?.data?.detail || error?.message || porDefecto

const Mesas = () => {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { sonarAviso } = useNotifications()
  const esAdmin = isAdmin(usuario?.rol)
  const cobra = puedeCobrar(usuario?.rol)

  const [mesas, setMesas] = useState([])
  const [secciones, setSecciones] = useState([])
  const [seccionId, setSeccionId] = useState(() => localStorage.getItem(CLAVE_SECCION) || '')
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [borrador, setBorrador] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mesaDetalle, setMesaDetalle] = useState(null)
  const [detalleComanda, setDetalleComanda] = useState(null)
  const [mostrarDivision, setMostrarDivision] = useState(false)
  // { id_mesa?, numero, capacidad } para el modal de alta/edición del modo plano
  const [formMesa, setFormMesa] = useState(null)
  const [, setReloj] = useState(0)

  const planoRef = useRef(null)
  const arrastre = useRef(null)
  // Mesas creadas en esta edición. Cancelar las quita; Guardar las deja.
  const mesasNuevas = useRef([])
  const listasVistas = useRef(null)
  // { timer, x, y } mientras se mantiene presionada una mesa
  const presion = useRef(null)
  // El toque que terminó en presión larga o en deslizar no debe abrir la mesa
  const ignorarClic = useRef(false)
  // { x, y, t, scroll } al empezar a tocar el plano
  const desliz = useRef(null)

  const elegirSeccion = (id) => {
    const valor = String(id || '')
    if (valor) localStorage.setItem(CLAVE_SECCION, valor)
    setSeccionId(valor)
  }

  const cargar = useCallback(async () => {
    try {
      const [data, zonas] = await Promise.all([
        mesaService.listar(),
        mesaService.listarSecciones(),
      ])
      const listaZonas = Array.isArray(zonas) ? zonas : []
      setSecciones(listaZonas)
      setSeccionId((actual) => {
        const guardada = actual || localStorage.getItem(CLAVE_SECCION) || ''
        const existe = listaZonas.some((z) => String(z.id_seccion) === String(guardada))
        const siguiente = existe ? String(guardada) : String(listaZonas[0]?.id_seccion || '')
        if (siguiente) localStorage.setItem(CLAVE_SECCION, siguiente)
        return siguiente
      })
      const lista = Array.isArray(data) ? data : []
      const listas = new Set(
        lista.filter((m) => estadoDeMesa(m) === 'cobrar').map((m) => m.cuenta.id_comanda)
      )
      if (listasVistas.current) {
        const hayNueva = [...listas].some((id) => !listasVistas.current.has(id))
        if (hayNueva) sonarAviso()
      }
      listasVistas.current = listas
      setMesas(lista)
    } catch (error) {
      console.error('Error al cargar mesas:', error)
    } finally {
      setCargando(false)
    }
  }, [sonarAviso])

  useEffect(() => {
    cargar()
    if (editando) return undefined
    const intervalo = setInterval(cargar, 10000)
    const alVolver = () => {
      if (document.visibilityState === 'visible') cargar()
    }
    window.addEventListener('comanda-actualizada', cargar)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('comanda-actualizada', cargar)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [cargar, editando])

  // Los minutos de cada mesa abierta avanzan aunque la lista no cambie
  useEffect(() => {
    const id = setInterval(() => setReloj((n) => n + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const deLaSeccion = (lista) => lista.filter((m) => !seccionId || String(m.id_seccion) === String(seccionId))
  const visibles = deLaSeccion(editando ? borrador : mesas)
  const conteo = ESTADOS.reduce((acc, e) => ({ ...acc, [e.id]: 0 }), {})
  visibles.forEach((m) => { conteo[estadoDeMesa(m)] += 1 })

  // ---- Servicio: abrir o continuar la cuenta de una mesa ----

  const abrirMesa = (mesa) => {
    if (!mesa.cuenta) {
      navigate('/punto-venta', {
        state: {
          nuevaOrdenPara: {
            nombre: `Mesa ${mesa.numero}`,
            tipoServicio: 'comer-aqui',
            idMesa: mesa.id_mesa,
            numeroMesa: mesa.numero,
          },
        },
      })
      return
    }
    setMesaDetalle(mesa)
    setDetalleComanda(null)
    setMostrarDivision(false)
    if (mesa.cuenta.id_comanda) {
      comandasService
        .obtenerComanda(mesa.cuenta.id_comanda)
        .then((comanda) => setDetalleComanda(comanda && !comanda.error ? comanda : null))
        .catch(() => setDetalleComanda(null))
    }
  }

  const avisarEnCaja = async (division = null) => {
    const id = mesaDetalle?.cuenta?.id_comanda
    if (!id) return
    try {
      await comandasService.solicitarCuenta(id, division)
      setMostrarDivision(false)
      await Swal.fire({
        icon: 'success',
        title: 'Se avisó en caja',
        text: 'Cuando llegues, el ticket ya va a estar listo.',
        position: 'top',
        heightAuto: false,
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'No se pudo avisar',
        text: extraerError(error, 'Intenta de nuevo'),
        position: 'top',
        heightAuto: false,
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
  }

  const cuentaParaDividir = () => {
    const detalles = detalleComanda?.detalles
    if (!detalles?.length) return null
    const items = detalles.map((d) => ({
      nombre: d.producto_nombre || d.nombre_producto || 'Producto',
      quantity: Number(d.cantidad) || 1,
      precio: parseFloat(d.precio_unitario) || 0,
      observaciones: d.observaciones || '',
    }))
    const subtotal = items.reduce((sum, item) => sum + item.precio * item.quantity, 0)
    return {
      items,
      subtotal,
      descuento: 0,
      propina: 0,
      total: subtotal,
      precioUnitario: (item) => parseFloat(item.precio) || 0,
    }
  }

  // ---- Modo Editar plano ----

  const entrarEdicion = () => {
    mesasNuevas.current = []
    setBorrador(deLaSeccion(mesas).map((m) => ({ ...m })))
    setEditando(true)
  }

  const cancelarEdicion = async () => {
    const pendientes = [...mesasNuevas.current]
    setFormMesa(null)
    setGuardando(true)
    const quitadas = []
    let aviso = ''
    for (const id of pendientes) {
      try {
        await mesaService.borrar(id)
        quitadas.push(id)
      } catch (error) {
        aviso = extraerError(error, 'No se quitó una mesa nueva')
        break
      }
    }
    mesasNuevas.current = mesasNuevas.current.filter((id) => !quitadas.includes(id))
    setBorrador((lista) => lista.filter((m) => !quitadas.includes(m.id_mesa)))
    setGuardando(false)
    if (aviso) {
      Swal.fire({
        position: 'top',
        heightAuto: false,
        icon: 'error',
        title: 'No se canceló la edición',
        text: aviso,
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
      return
    }
    setEditando(false)
    setBorrador([])
    cargar()
  }

  const guardarPlano = async () => {
    const originales = Object.fromEntries(mesas.map((m) => [m.id_mesa, m]))
    const movidas = borrador
      .filter((m) => {
        const o = originales[m.id_mesa]
        return !o || o.pos_x !== m.pos_x || o.pos_y !== m.pos_y
      })
      .map(({ id_mesa, pos_x, pos_y }) => ({ id_mesa, pos_x, pos_y }))
    setGuardando(true)
    try {
      if (movidas.length) await mesaService.guardarPlano(movidas)
      mesasNuevas.current = []
      setEditando(false)
      setBorrador([])
      await cargar()
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se guardó el plano',
        text: extraerError(error, 'Intenta de nuevo'),
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    } finally {
      setGuardando(false)
    }
  }

  const posicionEnPlano = (evento) => {
    const caja = planoRef.current.getBoundingClientRect()
    return {
      x: ((evento.clientX - caja.left) / caja.width) * 100,
      y: ((evento.clientY - caja.top) / caja.height) * 100,
    }
  }

  const cancelarPresion = () => {
    if (!presion.current) return
    clearTimeout(presion.current.timer)
    presion.current = null
  }

  const editarMesa = (mesa) => {
    setFormMesa({ id_mesa: mesa.id_mesa, numero: String(mesa.numero), capacidad: mesa.capacidad })
  }

  const alPresionar = (evento, mesa) => {
    ignorarClic.current = false
    cancelarPresion()
    if (!editando && !esAdmin) return
    presion.current = {
      x: evento.clientX,
      y: evento.clientY,
      timer: setTimeout(() => {
        presion.current = null
        arrastre.current = null
        ignorarClic.current = true
        navigator.vibrate?.(30)
        // Fuera del plano, la presión larga entra a editarlo con esa mesa abierta
        if (!editando) entrarEdicion()
        editarMesa(mesa)
      }, DURACION_PRESION_MS),
    }
    if (!editando) return
    evento.preventDefault()
    const p = posicionEnPlano(evento)
    arrastre.current = {
      mesa,
      dx: p.x - mesa.pos_x,
      dy: p.y - mesa.pos_y,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      movio: false,
    }
  }

  // El movimiento se escucha en la ventana: el dedo puede salirse de la mesa
  // (o del plano) a media arrastrada sin que la mesa se quede atorada.
  useEffect(() => {
    if (!editando) return undefined
    const moverA = (a, evento) => {
      const p = posicionEnPlano(evento)
      const m = mitades(a.mesa.capacidad)
      // Se ajusta a una cuadrícula de 1% para que las filas queden alineadas
      const x = limitar(Math.round(p.x - a.dx), Math.ceil(m.x), Math.floor(100 - m.x))
      const y = limitar(Math.round(p.y - a.dy), Math.ceil(m.y), Math.floor(100 - m.y))
      setBorrador((lista) => lista.map((b) => (b.id_mesa === a.mesa.id_mesa ? { ...b, pos_x: x, pos_y: y } : b)))
    }
    const mover = (evento) => {
      const a = arrastre.current
      if (!a) return
      if (!a.movio && Math.hypot(evento.clientX - a.inicioX, evento.clientY - a.inicioY) < 5) return
      a.movio = true
      cancelarPresion()
      moverA(a, evento)
    }
    const soltar = (evento) => {
      const a = arrastre.current
      arrastre.current = null
      if (!a) return
      if (a.movio || Math.hypot(evento.clientX - a.inicioX, evento.clientY - a.inicioY) >= 5) {
        moverA(a, evento)
      } else {
        cancelarPresion()
        editarMesa(a.mesa)
      }
    }
    const cancelar = () => { arrastre.current = null }
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    window.addEventListener('pointercancel', cancelar)
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      window.removeEventListener('pointercancel', cancelar)
    }
  }, [editando])

  const moverPresion = (evento) => {
    const p = presion.current
    if (p && Math.hypot(evento.clientX - p.x, evento.clientY - p.y) >= 5) cancelarPresion()
  }

  // ---- Deslizar el plano a izquierda o derecha cambia de sección ----

  const indiceSeccion = secciones.findIndex((s) => String(s.id_seccion) === String(seccionId))

  const alTocarPlano = (evento) => {
    if (editando || evento.touches.length !== 1) {
      desliz.current = null
      return
    }
    const t = evento.touches[0]
    desliz.current = { x: t.clientX, y: t.clientY, t: Date.now(), scroll: evento.currentTarget.scrollLeft }
  }

  const alSoltarPlano = (evento) => {
    const d = desliz.current
    desliz.current = null
    if (!d || editando || secciones.length < 2) return
    // En pantallas angostas el plano se recorre de lado: eso no cuenta como deslizar
    if (evento.currentTarget.scrollLeft !== d.scroll) return
    const t = evento.changedTouches[0]
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (Math.abs(dx) < DESLIZ_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5 || Date.now() - d.t > 800) return
    const siguiente = secciones[indiceSeccion + (dx < 0 ? 1 : -1)]
    if (!siguiente) return
    cancelarPresion()
    ignorarClic.current = true
    elegirSeccion(siguiente.id_seccion)
  }

  // Primer hueco del plano donde cabe la mesa sin encimarse con otra (ni con su etiqueta de cuenta)
  const lugarLibre = (capacidad) => {
    const nueva = mitades(capacidad)
    for (const margenY of [9, 3, 0]) {
      const choca = (x, y) => borrador.some((b) => {
        const otra = mitades(b.capacidad)
        return Math.abs(b.pos_x - x) < nueva.x + otra.x + 1 && Math.abs(b.pos_y - y) < nueva.y + otra.y + margenY
      })
      for (let y = Math.ceil(nueva.y) + 1; y <= 100 - nueva.y; y += 2) {
        for (let x = Math.ceil(nueva.x) + 1; x <= 100 - nueva.x; x += 2) {
          if (!choca(x, y)) return { x, y }
        }
      }
    }
    return { x: 50, y: 50 }
  }

  const siguienteNumero = () => {
    const numeros = new Map()
    mesas.forEach((m) => numeros.set(m.id_mesa, Number(m.numero) || 0))
    borrador.forEach((m) => numeros.set(m.id_mesa, Number(m.numero) || 0))
    return Math.max(0, ...numeros.values()) + 1
  }

  const nuevaMesa = () => {
    setFormMesa({ numero: String(siguienteNumero()), capacidad: null })
  }

  const pedirNombreSeccion = (titulo, valor, confirmar) => Swal.fire({
    position: 'top',
    heightAuto: false,
    title: titulo,
    input: 'text',
    inputValue: valor,
    inputPlaceholder: 'Terraza, piso 2, jardín…',
    showCancelButton: true,
    confirmButtonText: confirmar,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: 'rgb(var(--marca-500))',
    inputValidator: (texto) => (texto?.trim() ? undefined : 'Escribe un nombre'),
  })

  const agregarSeccion = async () => {
    const { value, isConfirmed } = await pedirNombreSeccion('Nueva sección', '', 'Agregar')
    if (!isConfirmed || !value?.trim()) return
    try {
      const creada = await mesaService.crearSeccion(value.trim())
      elegirSeccion(creada.id_seccion)
      await cargar()
    } catch (error) {
      Swal.fire({
        position: 'top',
        heightAuto: false,
        icon: 'error',
        title: 'No se agregó la sección',
        text: extraerError(error, 'Intenta de nuevo'),
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
  }

  const renombrarSeccion = async () => {
    const actual = secciones.find((s) => String(s.id_seccion) === String(seccionId))
    if (!actual) return
    const { value, isConfirmed } = await pedirNombreSeccion('Nombre de la sección', actual.nombre, 'Guardar')
    const nombre = value?.trim()
    if (!isConfirmed || !nombre || nombre === actual.nombre) return
    try {
      await mesaService.editarSeccion(actual.id_seccion, nombre)
      await cargar()
    } catch (error) {
      Swal.fire({
        position: 'top',
        heightAuto: false,
        icon: 'error',
        title: 'No se cambió el nombre',
        text: extraerError(error, 'Intenta de nuevo'),
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    }
  }

  const guardarFormMesa = async (evento) => {
    evento.preventDefault()
    const numero = parseInt(formMesa.numero, 10)
    if (!numero || numero < 1) return
    if (!formMesa.id_mesa && !formMesa.capacidad) return
    setGuardando(true)
    try {
      if (formMesa.id_mesa) {
        const editada = await mesaService.editar(formMesa.id_mesa, { numero, capacidad: formMesa.capacidad })
        // Una mesa más grande puede quedar fuera del plano: se reacomoda dentro
        const m = mitades(editada.capacidad)
        setBorrador((lista) => lista.map((b) => (b.id_mesa === editada.id_mesa
          ? {
            ...b,
            numero: editada.numero,
            capacidad: editada.capacidad,
            pos_x: limitar(b.pos_x, Math.ceil(m.x), Math.floor(100 - m.x)),
            pos_y: limitar(b.pos_y, Math.ceil(m.y), Math.floor(100 - m.y)),
          }
          : b)))
      } else {
        const lugar = lugarLibre(formMesa.capacidad)
        const creada = await mesaService.crear({
          numero,
          capacidad: formMesa.capacidad,
          pos_x: lugar.x,
          pos_y: lugar.y,
          id_seccion: Number(seccionId) || null,
        })
        setBorrador((lista) => [...lista, creada])
        mesasNuevas.current.push(creada.id_mesa)
      }
      setFormMesa(null)
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se guardó la mesa',
        text: extraerError(error, 'Intenta de nuevo'),
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    } finally {
      setGuardando(false)
    }
  }

  const borrarMesa = async () => {
    const confirmacion = await Swal.fire({
      icon: 'warning',
      title: `¿Quitar la mesa ${formMesa.numero}?`,
      text: 'Las ventas anteriores de esta mesa se conservan.',
      showCancelButton: true,
      confirmButtonText: 'Quitar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: 'rgb(220 38 38)',
    })
    if (!confirmacion.isConfirmed) return
    setGuardando(true)
    try {
      await mesaService.borrar(formMesa.id_mesa)
      mesasNuevas.current = mesasNuevas.current.filter((id) => id !== formMesa.id_mesa)
      setBorrador((lista) => lista.filter((b) => b.id_mesa !== formMesa.id_mesa))
      setFormMesa(null)
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'No se quitó la mesa',
        text: extraerError(error, 'Intenta de nuevo'),
        confirmButtonColor: 'rgb(var(--marca-500))',
      })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-marca-600" />
      </div>
    )
  }

  const cuentaDetalle = mesaDetalle?.cuenta
  const estadoDetalle = mesaDetalle ? estadoDeMesa(mesaDetalle) : null

  return (
    <div className="min-w-0 max-w-full space-y-3 lg:p-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {editando ? (
          <p className="text-sm text-gray-500">Arrastra las mesas. Tócala o déjala presionada para cambiar su número o tipo.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            {ESTADOS.map((e) => (
              <span key={e.id} className="inline-flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded-full ${e.punto}`} />
                {e.texto}
                <span className="font-semibold text-gray-900 tabular-nums">{conteo[e.id]}</span>
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input h-9 w-auto min-w-[9rem] py-1"
            value={seccionId}
            disabled={editando}
            onChange={(e) => elegirSeccion(e.target.value)}
          >
            {secciones.map((s) => (
              <option key={s.id_seccion} value={s.id_seccion}>{s.nombre}</option>
            ))}
          </select>
          {esAdmin && !editando && (
            <>
              <button type="button" onClick={agregarSeccion} className="btn-outline flex items-center gap-2 !py-1.5">
                <Plus className="h-4 w-4" /> Sección
              </button>
              <button
                type="button"
                onClick={renombrarSeccion}
                disabled={!seccionId}
                className="btn-outline flex items-center gap-2 !py-1.5 disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" /> Nombre
              </button>
            </>
          )}
        {esAdmin && (
          <div className="flex items-center gap-2">
            {editando ? (
              <>
                <button onClick={nuevaMesa} disabled={guardando} className="btn-outline flex items-center gap-2 !py-1.5">
                  <Plus className="h-4 w-4" /> Agregar mesa
                </button>
                <button
                  onClick={cancelarEdicion}
                  disabled={guardando}
                  className="px-4 py-1.5 rounded-lg border-2 border-red-200 text-red-600 font-medium hover:bg-red-50"
                >
                  Cancelar
                </button>
                <button onClick={guardarPlano} disabled={guardando} className="btn-primary flex items-center gap-2 !py-1.5">
                  {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Guardar
                </button>
              </>
            ) : (
              <button onClick={entrarEdicion} className="btn-outline flex items-center gap-2 !py-1.5">
                <Pencil className="h-4 w-4" /> Editar plano
              </button>
            )}
          </div>
        )}
        </div>
      </div>

      <div
        className="overflow-x-auto rounded-xl border border-gray-200 bg-white"
        onTouchStart={alTocarPlano}
        onTouchEnd={alSoltarPlano}
        onTouchCancel={() => { desliz.current = null }}
      >
        <div
          ref={planoRef}
          onDragStart={(e) => e.preventDefault()}
          className="relative w-full min-w-[640px] select-none"
          style={{
            aspectRatio: `${ANCHO_PLANO} / ${ALTO_PLANO}`,
            backgroundImage: editando
              ? 'radial-gradient(rgb(209 213 219) 1px, transparent 1px)'
              : 'none',
            backgroundSize: '2.5% 4%',
          }}
        >
          {visibles.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <UtensilsCrossed className="h-8 w-8" />
              <p className="text-sm">
                {esAdmin ? 'Aún no hay mesas en esta sección. Entra a Editar plano para agregarlas.' : 'Aún no hay mesas en esta sección.'}
              </p>
            </div>
          )}

          {visibles.map((mesa) => {
            const forma = formaMesa(mesa.capacidad)
            const estado = estadoDeMesa(mesa)
            const min = minutosDesde(mesa.cuenta?.abierta_desde)
            const esperaComida = minutosDesde(mesa.cuenta?.comida_desde)
            return (
              <button
                key={mesa.id_mesa}
                type="button"
                onClick={() => {
                  if (ignorarClic.current) {
                    ignorarClic.current = false
                    return
                  }
                  if (!editando) abrirMesa(mesa)
                }}
                onPointerDown={(e) => alPresionar(e, mesa)}
                onPointerMove={moverPresion}
                onPointerUp={cancelarPresion}
                onPointerLeave={cancelarPresion}
                onPointerCancel={cancelarPresion}
                onContextMenu={(e) => e.preventDefault()}
                title={`Mesa ${mesa.numero}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-lg transition-transform focus:outline-none [-webkit-touch-callout:none] ${
                  editando
                    ? 'cursor-grab touch-none outline-dashed outline-1 outline-offset-4 outline-gray-300 active:cursor-grabbing'
                    : 'hover:scale-105 active:scale-95'
                }`}
                style={{
                  left: `${mesa.pos_x}%`,
                  top: `${mesa.pos_y}%`,
                  width: `${(forma.w / ANCHO_PLANO) * 100}%`,
                  aspectRatio: `${forma.w} / ${forma.h}`,
                }}
              >
                <DibujoMesa capacidad={mesa.capacidad} numero={mesa.numero} estado={estado} />
                {!editando && mesa.cuenta && (
                  <span className="absolute left-1/2 top-full mt-1 flex -translate-x-1/2 flex-col items-center gap-0.5">
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${ETIQUETA_ESTADO[estado]}`}>
                      {dinero(mesa.cuenta.total)}{min != null ? ` · ${textoTiempo(min)}` : ''}
                    </span>
                    {esperaComida != null && (
                      <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${colorEsperaComida(esperaComida)}`}>
                        Comida {textoTiempo(esperaComida)}
                      </span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Indica que hay más secciones a los lados del plano */}
      {!editando && secciones.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {secciones.map((s, i) => (
            <button
              key={s.id_seccion}
              type="button"
              onClick={() => elegirSeccion(s.id_seccion)}
              title={s.nombre}
              aria-label={`Sección ${s.nombre}`}
              className={`h-2 rounded-full transition-all ${i === indiceSeccion ? 'w-5 bg-marca-500' : 'w-2 bg-gray-300'}`}
            />
          ))}
        </div>
      )}

      {/* Detalle de una mesa ocupada */}
      {mesaDetalle && cuentaDetalle && (
        <div className={OVERLAY_MODAL} onClick={() => { setMesaDetalle(null); setMostrarDivision(false) }}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mt-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="flex-1 text-lg font-semibold text-gray-900">Mesa {mesaDetalle.numero}</h2>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${ETIQUETA_ESTADO[estadoDetalle]}`}>
                  {estadoDetalle === 'cobrar' ? 'Para cobrar' : 'En cocina'}
                </span>
                <button
                  onClick={() => { setMesaDetalle(null); setMostrarDivision(false) }}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                Abierta hace {textoTiempo(minutosDesde(cuentaDetalle.abierta_desde)) || '—'}
              </p>
              {cuentaDetalle.comida_desde && (
                <p className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-medium ${colorEsperaComida(minutosDesde(cuentaDetalle.comida_desde))}`}>
                  <UtensilsCrossed className="h-4 w-4" />
                  Esperando comida {textoTiempo(minutosDesde(cuentaDetalle.comida_desde))}
                </p>
              )}

              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                {detalleComanda?.detalles?.length ? (
                  detalleComanda.detalles.map((d) => (
                    <div key={d.id_detalle_comanda} className="flex items-baseline gap-2 px-3 py-2 text-sm">
                      <span className="font-semibold tabular-nums text-gray-900">{d.cantidad}×</span>
                      <span className="flex-1 min-w-0 truncate text-gray-700">{d.producto_nombre || d.nombre_producto}</span>
                    </div>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-500">
                    {cuentaDetalle.productos} {cuentaDetalle.productos === 1 ? 'producto' : 'productos'}
                  </p>
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-medium text-gray-600">Total</span>
                  <span className="text-base font-bold tabular-nums text-gray-900">{dinero(cuentaDetalle.total)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <div className={`grid gap-2 ${cobra && estadoDetalle === 'cobrar' ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <button
                    onClick={() => navigate('/punto-venta', { state: { editarComandaId: cuentaDetalle.id_comanda } })}
                    disabled={!cuentaDetalle.id_comanda}
                    className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap shadow-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4 shrink-0" /> Agregar productos
                  </button>
                  {cobra && estadoDetalle === 'cobrar' && (
                    <button
                      onClick={() => navigate('/punto-venta', { state: { cobrarComandaId: cuentaDetalle.id_comanda } })}
                      className="btn-primary flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Receipt className="h-4 w-4" /> Cobrar
                    </button>
                  )}
                </div>
                {estadoDetalle === 'cobrar' && cuentaDetalle.id_comanda && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => avisarEnCaja(null)}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-400 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
                    >
                      <Printer className="h-4 w-4 shrink-0" /> Imprimir cuenta
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrarDivision(true)}
                      disabled={!detalleComanda?.detalles?.length}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Dividir cuenta
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mostrarDivision && cuentaParaDividir() && (
        <DividirCuentaModal
          cuenta={cuentaParaDividir()}
          textoAccion="Enviar cuenta"
          onClose={() => setMostrarDivision(false)}
          onImprimir={(division) => avisarEnCaja(division)}
        />
      )}

      {/* Alta y edición de una mesa (modo plano) */}
      {formMesa && (
        <div className={OVERLAY_MODAL} onClick={() => !guardando && setFormMesa(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mt-4" onClick={(e) => e.stopPropagation()}>
            <form className="p-4 space-y-3" onSubmit={guardarFormMesa}>
              <h2 className="text-lg font-semibold text-gray-900">
                {formMesa.id_mesa ? `Mesa ${formMesa.numero}` : 'Nueva mesa'}
              </h2>
              <div>
                <label className="campo-label">Número</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="999"
                  value={formMesa.numero}
                  onChange={(e) => setFormMesa((f) => ({ ...f, numero: e.target.value }))}
                  className="campo"
                />
              </div>
              <div>
                <p className="campo-label">Tipo de mesa</p>
                <div className="grid grid-cols-3 gap-2">
                  {CAPACIDADES.map((c) => {
                    const activa = formMesa.capacidad === c
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setFormMesa((f) => ({ ...f, capacidad: c }))}
                        className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-xs transition-colors ${
                          activa ? 'border-marca-500 bg-marca-50 text-marca-700 font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <span className="flex h-12 w-full items-center justify-center">
                          <span className="h-full" style={{ aspectRatio: `${formaMesa(c).w} / ${formaMesa(c).h}` }}>
                            <DibujoMesa capacidad={c} numero="" estado="libre" />
                          </span>
                        </span>
                        {NOMBRE_TIPO[c]}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className={`grid gap-2 pt-2 ${formMesa.id_mesa ? 'grid-cols-[auto_1fr_1fr]' : 'grid-cols-2'}`}>
                {formMesa.id_mesa && (
                  <button
                    type="button"
                    onClick={borrarMesa}
                    disabled={guardando}
                    className="p-2.5 rounded-lg border-2 border-red-200 text-red-600 hover:bg-red-50"
                    title="Quitar mesa"
                    aria-label="Quitar mesa"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setFormMesa(null)}
                  disabled={guardando}
                  className="w-full py-2.5 rounded-lg border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !parseInt(formMesa.numero, 10) || (!formMesa.id_mesa && !formMesa.capacidad)}
                  className="btn-primary w-full py-2.5 border-2 border-transparent disabled:opacity-50"
                >
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Mesas
