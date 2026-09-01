import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCaja } from '../hooks/useCaja'
import { Wallet, Loader2, AlertCircle } from 'lucide-react'
import Swal from 'sweetalert2'

const formatMoney = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n || 0)

// Deja solo dígitos y un punto decimal con máximo 2 posiciones
const sanitizeMonto = (raw) => {
  const limpio = String(raw).replace(/[^\d.]/g, '')
  const [entero, ...resto] = limpio.split('.')
  if (resto.length === 0) return entero
  return `${entero}.${resto.join('').slice(0, 2)}`
}

const conSeparadorMiles = (valor) => {
  if (valor === '' || valor == null) return ''
  const [entero, decimales] = String(valor).split('.')
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decimales !== undefined ? `${enteroFormateado}.${decimales}` : enteroFormateado
}

const Caja = () => {
  const location = useLocation()
  const { estado, loading, error, abrirCaja, cerrarCaja } = useCaja()
  const [montoInicial, setMontoInicial] = useState('300')
  const [motivoMonto, setMotivoMonto] = useState('')
  const [montoContado, setMontoContado] = useState('')
  const [justificacion, setJustificacion] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (location.state?.cajaCerrada) {
      Swal.fire({
        icon: 'info',
        title: 'Caja cerrada',
        text: 'Debes abrir caja antes de usar el punto de venta.',
        confirmButtonColor: '#2d5a27',
      })
    }
  }, [location.state])

  const handleAbrir = async () => {
    setProcesando(true)
    const monto = parseFloat(montoInicial)
    if (monto !== 300 && !motivoMonto.trim()) {
      Swal.fire('Atención', 'Indique el motivo cuando el monto difiere de $300', 'warning')
      setProcesando(false)
      return
    }
    const result = await abrirCaja({
      monto_inicial: monto,
      motivo_monto_distinto: monto !== 300 ? motivoMonto : null,
    })
    setProcesando(false)
    if (result.error) {
      Swal.fire('Error', result.error, 'error')
    } else {
      Swal.fire('Éxito', 'Caja abierta correctamente', 'success')
    }
  }

  const handleCerrar = async () => {
    const contado = parseFloat(montoContado)
    if (isNaN(contado)) {
      Swal.fire('Atención', 'Ingrese el monto contado', 'warning')
      return
    }
    const esperado = estado?.efectivo_esperado || 0
    const diferencia = contado - esperado
    if (Math.abs(diferencia) > 0.01 && !justificacion.trim()) {
      Swal.fire('Atención', 'Debe justificar la diferencia en el arqueo', 'warning')
      return
    }
    const confirm = await Swal.fire({
      title: '¿Cerrar caja?',
      html: `Esperado: ${formatMoney(esperado)}<br>Contado: ${formatMoney(contado)}<br>Diferencia: ${formatMoney(diferencia)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Cerrar caja',
    })
    if (!confirm.isConfirmed) return

    setProcesando(true)
    const idSesion = estado?.sesion?.id_sesion_caja
    const result = await cerrarCaja(idSesion, {
      monto_contado: contado,
      justificacion_diferencia: diferencia !== 0 ? justificacion : null,
    })
    setProcesando(false)
    if (result.error) {
      Swal.fire('Error', result.error, 'error')
    } else {
      Swal.fire('Éxito', 'Caja cerrada correctamente', 'success')
      setMontoContado('')
      setJustificacion('')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-matcha-500" />
      </div>
    )
  }

  if (error && estado?._error) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-coffee-800 mb-2">No se pudo consultar la caja</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-matcha-500 text-white px-4 py-2 rounded-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!estado?.abierta) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Wallet className="w-8 h-8 text-matcha-500" />
            <h1 className="text-2xl font-bold text-coffee-800">Abrir Caja</h1>
          </div>
          <p className="text-gray-600 mb-6">No hay caja abierta. Declare el fondo de cambio para iniciar el turno.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto inicial</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={conSeparadorMiles(montoInicial)}
                  onChange={(e) => setMontoInicial(sanitizeMonto(e.target.value))}
                  className="w-full border rounded-lg pl-8 pr-4 py-2 text-right tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
            {parseFloat(montoInicial) !== 300 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del monto distinto</label>
                <input
                  type="text"
                  value={motivoMonto}
                  onChange={(e) => setMotivoMonto(e.target.value)}
                  className="w-full border rounded-lg px-4 py-2"
                  placeholder="Obligatorio si difiere de $300"
                />
              </div>
            )}
            <button
              onClick={handleAbrir}
              disabled={procesando}
              className="w-full bg-matcha-500 text-white py-3 rounded-lg font-medium hover:bg-matcha-600 disabled:opacity-50"
            >
              {procesando ? 'Abriendo...' : 'Abrir Caja'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const sesion = estado.sesion
  const diferenciaPreview = montoContado ? parseFloat(montoContado) - (estado.efectivo_esperado || 0) : null
  const ventasTarjetaTransferencia =
    (estado.ventas_tarjeta || 0) + (estado.ventas_transferencia || 0)
  const totalVentas = (estado.ventas_efectivo || 0) + ventasTarjetaTransferencia

  return (
    <div className="p-4 w-full space-y-3">
      <div className="flex items-center gap-2">
        <Wallet className="w-6 h-6 text-matcha-500 shrink-0" />
        <div>
          <h1 className="text-xl font-bold text-coffee-800 leading-tight">Estado de Caja</h1>
          <p className="text-gray-500 text-xs">
            Abierta por {sesion?.nombre_usuario_apertura} · {new Date(sesion?.fecha_apertura).toLocaleString('es-MX')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 items-start">
        {/* Columna principal: métricas */}
        <div className="xl:col-span-2 space-y-3">
          {/* Resumen */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg px-3 py-2.5 border border-gray-200 flex items-baseline justify-between gap-2">
              <span className="text-xs text-gray-500">Monto inicial</span>
              <span className="text-base font-bold text-coffee-800">{formatMoney(sesion?.monto_inicial)}</span>
            </div>
            <div className="bg-matcha-50 rounded-lg px-3 py-2.5 border-2 border-matcha-500 flex items-baseline justify-between gap-2">
              <span className="text-xs text-matcha-700 font-medium">Efectivo esperado</span>
              <span className="text-base font-bold text-matcha-800">{formatMoney(estado.efectivo_esperado)}</span>
            </div>
          </div>

          {/* Ventas */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-coffee-800">Ventas del turno</h2>
              <span className="text-xs font-semibold text-gray-700">{formatMoney(totalVentas)}</span>
            </div>
            <div className="grid grid-cols-2 text-sm">
              <div className="px-3 py-2 flex items-baseline justify-between gap-2 border-r border-gray-100">
                <span className="text-[11px] text-gray-500">Efectivo</span>
                <span className="font-bold text-coffee-800">{formatMoney(estado.ventas_efectivo)}</span>
              </div>
              <div className="px-3 py-2 flex items-baseline justify-between gap-2 bg-blue-50">
                <span className="text-[11px] text-blue-600 font-medium">Tarjeta / Transferencia</span>
                <span className="font-bold text-blue-700">{formatMoney(ventasTarjetaTransferencia)}</span>
              </div>
            </div>
          </div>

          {/* Entradas / Salidas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 rounded-lg border border-green-200 px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs font-semibold text-green-800 truncate">Entradas</span>
              </div>
              <span className="text-sm font-bold text-green-700 shrink-0">{formatMoney(estado.entradas_efectivo)}</span>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 px-3 py-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="text-xs font-semibold text-red-800 truncate">Salidas</span>
              </div>
              <span className="text-sm font-bold text-red-700 shrink-0">{formatMoney(estado.salidas_efectivo)}</span>
            </div>
          </div>

          {/* Propinas + ventas por usuario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-coffee-800">Propinas</h2>
              </div>
              <div className="grid grid-cols-2 text-sm">
                <div className="px-3 py-2 flex items-baseline justify-between gap-2 border-r border-gray-100">
                  <span className="text-[11px] text-gray-500">Efectivo</span>
                  <span className="font-bold text-coffee-800">{formatMoney(estado.propinas_efectivo)}</span>
                </div>
                <div className="px-3 py-2 flex items-baseline justify-between gap-2">
                  <span className="text-[11px] text-gray-500">Tarjeta</span>
                  <span className="font-bold text-coffee-800">{formatMoney(estado.propinas_tarjeta)}</span>
                </div>
              </div>
            </div>

            {estado.ventas_por_usuario?.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2">
                <h2 className="text-sm font-semibold text-coffee-800 mb-1.5">Ventas por usuario</h2>
                <div className="space-y-1">
                  {estado.ventas_por_usuario.map((v, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-700">{v.nombre} {v.apellido_paterno}</span>
                      <span className="text-gray-600">{v.num_ventas} · {formatMoney(v.total_vendido)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Columna lateral: cierre */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 xl:sticky xl:top-4">
          <h2 className="text-sm font-semibold text-coffee-800 mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4" /> Cierre con arqueo
          </h2>
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Efectivo contado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={conSeparadorMiles(montoContado)}
                  onChange={(e) => setMontoContado(sanitizeMonto(e.target.value))}
                  className="w-full border rounded-lg pl-7 pr-3 py-1.5 text-sm text-right tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>
            {diferenciaPreview !== null && Math.abs(diferenciaPreview) > 0.01 && (
              <div>
                <p className={`text-xs font-medium text-right tabular-nums ${diferenciaPreview > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Diferencia: {formatMoney(diferenciaPreview)} ({diferenciaPreview > 0 ? 'sobrante' : 'faltante'})
                </p>
                <input
                  type="text"
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-1.5 text-sm mt-1.5"
                  placeholder="Justificación obligatoria"
                />
              </div>
            )}
            <button
              onClick={handleCerrar}
              disabled={procesando}
              className="w-full bg-coffee-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-coffee-900 disabled:opacity-50"
            >
              {procesando ? 'Cerrando...' : 'Cerrar Caja'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Caja
