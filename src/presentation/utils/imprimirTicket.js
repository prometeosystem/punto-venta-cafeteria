/**
 * Abre una ventana de impresión con el ticket de venta (formato 80mm).
 */
import marca from '@marca'
import { getNombreExtra, desglosarExtrasCarrito } from './productOptionsConfig'
import { seccionesTicket, fechaHoraTicket } from './cuentaTicket'

// La ventana emergente arranca en about:blank, así que la ruta del logo tiene
// que ser absoluta o no la resuelve.
const logoAbsoluto = marca.logoTicket ? new URL(marca.logoTicket, window.location.origin).href : null

const PROPINA_SUGERIDA_PCT = 10

const formatMoney = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const fila = (label, valor, clase = '') =>
  `<tr class="${clase}"><td class="label">${label}</td><td class="value">${valor}</td></tr>`

const itemsHtml = (items) =>
  items
    .map((item) => {
      const sub = item.subtotal ?? Number(item.precio) * Number(item.cantidad)
      const obs = item.observaciones
        ? `<div class="obs">${escapeHtml(item.observaciones)}</div>`
        : ''
      return `
        <tr>
          <td class="qty">${escapeHtml(item.cantidad)}</td>
          <td class="name">${escapeHtml(item.nombre)}${obs}</td>
          <td class="amt">${formatMoney(sub)}</td>
        </tr>`
    })
    .join('')

const seccionHtml = (seccion, esCuenta) => {
  const sugerida = esCuenta && !(Number(seccion.propina) > 0)
  return `
  <table><tbody>${itemsHtml(seccion.items)}</tbody></table>
  <div class="sep"></div>
  <table class="totals">
    ${fila('Subtotal', formatMoney(seccion.subtotal))}
    ${Number(seccion.descuento) > 0 ? fila('Descuento', `-${formatMoney(seccion.descuento)}`) : ''}
    ${Number(seccion.propina) > 0 ? fila('Propina', formatMoney(seccion.propina)) : ''}
    ${fila('TOTAL', formatMoney(seccion.total), 'total-row')}
    ${
      sugerida
        ? fila(
            `Propina sugerida ${PROPINA_SUGERIDA_PCT}%`,
            formatMoney((Number(seccion.total) || 0) * (PROPINA_SUGERIDA_PCT / 100))
          )
        : ''
    }
  </table>`
}

/**
 * @param {Object} ticket
 * @param {'cuenta'|'venta'} [ticket.tipo]
 * @param {string|number} [ticket.numero]
 * @param {string} [ticket.metodoPago]
 * @param {string} [ticket.cajero]
 * @param {string} [ticket.comentarios]
 * @param {Array<{nombre:string, cantidad:number, precio:number, subtotal?:number, observaciones?:string}>} ticket.items
 * @param {number} ticket.subtotal
 * @param {number} [ticket.descuento]
 * @param {number} [ticket.propina]
 * @param {number} ticket.total
 * @param {Object} [ticket.division] { modo: 'productos', cuentas }: una sección por persona
 */
export function imprimirTicket(ticket) {
  const esCuenta = ticket.tipo === 'cuenta'
  const { fecha, hora } = fechaHoraTicket()
  const secciones = seccionesTicket(ticket)
  const division = ticket.division

  const cuerpo = secciones
    .map((seccion) => seccionHtml(seccion, esCuenta))
    .join('<div class="sep doble"></div>')

  const cierreDivision =
    division?.modo === 'productos'
      ? `<div class="sep doble"></div>
  <table class="totals">${fila('TOTAL MESA', formatMoney(ticket.total), 'total-row')}</table>`
      : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${esCuenta ? 'Cuenta' : 'Ticket'} ${escapeHtml(ticket.numero ?? '')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 11px;
      line-height: 1.25;
      color: #000;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 2mm 3mm;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .sep { border-top: 1px dashed #000; margin: 4px 0; }
    .sep.doble { border-top-style: double; border-top-width: 3px; margin: 6px 0; }
    .info { display: grid; grid-template-columns: 1fr auto; column-gap: 8px; }
    .info > div { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .info .r { text-align: right; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 1px 0; }
    .qty { width: 16px; }
    .amt { text-align: right; white-space: nowrap; width: 64px; }
    .name { padding: 0 4px; }
    .obs { font-size: 9px; color: #333; }
    .totals .label { text-align: left; }
    .totals .value { text-align: right; }
    .total-row { font-size: 13px; font-weight: 700; }
    .footer { margin-top: 4px; text-align: center; font-size: 10px; font-weight: 700; }
    .logo { width: 38mm; max-width: 100%; display: inline-block; }
    .marca { font-size: 18px; font-weight: 800; letter-spacing: 1px; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm; padding: 2mm 3mm; }
    }
  </style>
</head>
<body>
  <div class="center">
    ${
      logoAbsoluto
        ? `<img class="logo" src="${logoAbsoluto}" alt="${escapeHtml(marca.nombre)}" />`
        : `<div class="marca">${escapeHtml(marca.nombreTicket)}</div>`
    }
  </div>
  <div class="sep"></div>
  <div class="info">
    <div>${ticket.numero != null ? `Ticket #${escapeHtml(ticket.numero)}` : ''}</div>
    <div class="r">${escapeHtml(fecha)}</div>
    <div>${ticket.cajero ? `Atendió: ${escapeHtml(ticket.cajero)}` : ''}</div>
    <div class="r">${escapeHtml(hora)}</div>
    ${
      ticket.metodoPago && !esCuenta
        ? `<div>Pago: ${escapeHtml(String(ticket.metodoPago).toUpperCase())}</div><div></div>`
        : ''
    }
  </div>
  <div class="sep"></div>
  ${cuerpo}
  ${cierreDivision}
  ${
    ticket.comentarios
      ? `<div class="sep"></div><div><span class="bold">Notas:</span> ${escapeHtml(ticket.comentarios)}</div>`
      : ''
  }
  <div class="sep"></div>
  <div class="footer">Gracias por su visita</div>
  <script>
    window.onload = function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`

  const ventana = window.open('', '_blank', 'width=320,height=640')
  if (!ventana) {
    return { error: 'El navegador bloqueó la ventana de impresión. Permite pop-ups e intenta de nuevo.' }
  }
  ventana.document.open()
  ventana.document.write(html)
  ventana.document.close()
  return { ok: true }
}

const LECHE_TICKET = {
  deslactosada: 'Deslactosada',
  almendras: 'Almendras',
}

const PREPARACION_TICKET = {
  heladas: 'Fría',
  frapeadas: 'Frapeada',
}

/**
 * Renglón de opciones que va debajo del producto en el ticket.
 * Se arma desde los campos estructurados; `observaciones` ya trae esa misma
 * información en prosa, así que solo sirve de respaldo cuando no vienen.
 */
function detalleOpciones(item) {
  const partes = []
  if (item.tipoLeche && item.tipoLeche !== 'entera') {
    partes.push(LECHE_TICKET[item.tipoLeche] || item.tipoLeche)
  }
  if (item.extras?.length) {
    partes.push(item.extras.map(getNombreExtra).join(', '))
  }
  if (item.tipoProteina) {
    partes.push('Scoop proteína')
  }
  if (item.tipoPreparacion) {
    partes.push(PREPARACION_TICKET[item.tipoPreparacion] || item.tipoPreparacion)
  }
  if (partes.length) return partes.join(' - ')
  return item.observaciones || null
}

/**
 * Construye items de ticket a partir del carrito del POS.
 * El importe de cada renglón incluye sus extras para que los renglones sumen el subtotal.
 */
export function itemsDesdeCarrito(cart = []) {
  return cart.map((item) => {
    const precio = parseFloat(item.precio) || 0
    const cantidad = item.quantity || 1
    const { extraLeche, extraExtras, extraProteina } = desglosarExtrasCarrito([{ ...item, quantity: cantidad }])
    return {
      nombre: item.nombre || item.producto_nombre || 'Producto',
      cantidad,
      precio,
      subtotal: precio * cantidad + extraLeche + extraExtras + extraProteina,
      observaciones: detalleOpciones(item),
    }
  })
}
