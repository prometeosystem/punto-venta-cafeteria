import Swal from 'sweetalert2'
import { imprimirTicket } from './imprimirTicket'

/**
 * Manda el ticket a la impresora térmica y, si falla o no hay conexión,
 * ofrece la impresión por el navegador.
 * @param {Object} printer el de usePrinterContext()
 */
export async function enviarTicket(printer, ticket, tituloExito, textoExito) {
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
      return true
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
      if (!retry.isConfirmed) return false
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
    return false
  }
  return true
}
