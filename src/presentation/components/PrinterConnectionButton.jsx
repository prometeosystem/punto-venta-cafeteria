import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Printer } from 'lucide-react'
import Swal from 'sweetalert2'

/**
 * Botón para conectar / reconectar / desconectar la impresora térmica.
 */
const PrinterConnectionButton = ({ printer, className = '', iconOnly = false }) => {
  if (!printer) return null

  const {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    printTest,
    device,
    savedInfo,
    hasSavedDevice,
  } = printer
  const soportaBluetooth = typeof navigator !== 'undefined' && !!navigator.bluetooth

  const handleClick = async () => {
    if (!soportaBluetooth) {
      await Swal.fire({
        icon: 'warning',
        title: 'Bluetooth no disponible',
        text: 'Usa Chrome o Edge en HTTPS o localhost para conectar la impresora.',
        confirmButtonColor: '#10b981',
      })
      return
    }

    if (isConnected) {
      const result = await Swal.fire({
        icon: 'info',
        title: 'Impresora conectada',
        text: device?.name
          ? `Dispositivo: ${device.name}. Se reconectará sola al recargar.`
          : 'Impresora lista. Se reconectará sola al recargar.',
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Probar impresión',
        denyButtonText: 'Desconectar',
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#10b981',
        denyButtonColor: '#ef4444',
      })
      if (result.isConfirmed) {
        try {
          await printTest()
          await Swal.fire({
            icon: 'success',
            title: 'Prueba enviada',
            timer: 1500,
            showConfirmButton: false,
          })
        } catch (err) {
          await Swal.fire({
            icon: 'error',
            title: 'Error al imprimir',
            text: err.message || 'No se pudo enviar la prueba',
            confirmButtonColor: '#10b981',
          })
        }
      } else if (result.isDenied) {
        await disconnect()
      }
      return
    }

    const ok = await connect()
    if (!ok) {
      await Swal.fire({
        icon: 'error',
        title: 'No se conectó',
        text: error || 'Enciende la impresora, acércala y vuelve a intentar.',
        confirmButtonColor: '#10b981',
      })
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'Impresora conectada',
        text: 'Quedará guardada y se reconectará sola al recargar o cambiar de página.',
        timer: 2200,
        showConfirmButton: false,
      })
    }
  }

  const base =
    'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors'
  // Sin conexión siempre en rojo: imprimir es parte del cobro y enterarse
  // hasta que falla el ticket es demasiado tarde.
  const classes = isConnected
    ? `${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`
    : `${base} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`

  const label = isConnecting
    ? 'Reconectando…'
    : isConnected
      ? 'Listo'
      : hasSavedDevice
        ? 'Reconectar'
        : 'Conectar'

  if (iconOnly) {
    const colorEstado = isConnected ? 'text-emerald-400' : 'text-red-400'

    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isConnecting}
        className={`p-2.5 rounded-lg transition-colors ${colorEstado} ${className}`}
        title={`Impresora: ${label}`}
        aria-label={`Impresora: ${label}`}
      >
        {isConnecting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Printer className="w-5 h-5" />
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isConnecting}
      className={`${classes} ${className}`}
      title={label}
    >
      {isConnecting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isConnected ? (
        <BluetoothConnected className="w-4 h-4" />
      ) : soportaBluetooth ? (
        <Bluetooth className="w-4 h-4" />
      ) : (
        <BluetoothOff className="w-4 h-4" />
      )}
      <Printer className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

export default PrinterConnectionButton
