/**
 * Abre una ventana de impresión con el ticket de venta (formato 80mm).
 */
const formatMoney = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n) || 0)

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * @param {Object} ticket
 * @param {string|number} [ticket.numero]
 * @param {string} [ticket.ticketId]
 * @param {string} [ticket.fecha]
 * @param {string} [ticket.cliente]
 * @param {string} [ticket.tipoServicio]
 * @param {string} [ticket.metodoPago]
 * @param {string} [ticket.cajero]
 * @param {string} [ticket.comentarios]
 * @param {Array<{nombre:string, cantidad:number, precio:number, subtotal?:number, observaciones?:string}>} ticket.items
 * @param {number} ticket.subtotal
 * @param {number} [ticket.propina]
 * @param {number} ticket.total
 */
export function imprimirTicket(ticket) {
  const fecha =
    ticket.fecha ||
    new Date().toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'medium',
    })

  const itemsHtml = (ticket.items || [])
    .map((item) => {
      const sub = item.subtotal ?? Number(item.precio) * Number(item.cantidad)
      const obs = item.observaciones
        ? `<div class="obs">${escapeHtml(item.observaciones)}</div>`
        : ''
      return `
        <tr>
          <td class="qty">${escapeHtml(item.cantidad)}</td>
          <td class="name">
            ${escapeHtml(item.nombre)}
            ${obs}
          </td>
          <td class="amt">${formatMoney(sub)}</td>
        </tr>`
    })
    .join('')

  const tipoServicioLabel = {
    'comer-aqui': 'Comer aquí',
    'para-llevar': 'Para llevar',
    delivery: 'Delivery',
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Ticket ${escapeHtml(ticket.numero ?? ticket.ticketId ?? '')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 4mm;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .brand { font-size: 16px; font-weight: 700; letter-spacing: 0.5px; }
    .muted { color: #333; font-size: 11px; }
    .sep { border-top: 1px dashed #000; margin: 8px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; padding: 2px 0; }
    .qty { width: 18px; }
    .amt { text-align: right; white-space: nowrap; width: 70px; }
    .name { padding: 0 4px; }
    .obs { font-size: 10px; color: #333; }
    .totals td { padding: 2px 0; }
    .totals .label { text-align: left; }
    .totals .value { text-align: right; }
    .total-row { font-size: 14px; font-weight: 700; }
    .footer { margin-top: 10px; text-align: center; font-size: 11px; }
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { width: 80mm; padding: 3mm; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">ZONA 2</div>
    <div class="muted">Cafetería</div>
    <div class="muted">${escapeHtml(fecha)}</div>
  </div>
  <div class="sep"></div>
  <div>
    ${ticket.numero != null ? `<div><span class="bold">Ticket #</span>${escapeHtml(ticket.numero)}</div>` : ''}
    ${ticket.ticketId ? `<div class="muted">${escapeHtml(ticket.ticketId)}</div>` : ''}
    ${ticket.cliente ? `<div><span class="bold">Cliente:</span> ${escapeHtml(ticket.cliente)}</div>` : ''}
    ${ticket.tipoServicio ? `<div><span class="bold">Servicio:</span> ${escapeHtml(tipoServicioLabel[ticket.tipoServicio] || ticket.tipoServicio)}</div>` : ''}
    ${ticket.metodoPago ? `<div><span class="bold">Pago:</span> ${escapeHtml(String(ticket.metodoPago).toUpperCase())}</div>` : ''}
    ${ticket.cajero ? `<div><span class="bold">Atendió:</span> ${escapeHtml(ticket.cajero)}</div>` : ''}
  </div>
  <div class="sep"></div>
  <table>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>
  <div class="sep"></div>
  <table class="totals">
    <tr>
      <td class="label">Subtotal</td>
      <td class="value">${formatMoney(ticket.subtotal)}</td>
    </tr>
    ${
      ticket.propina > 0
        ? `<tr>
      <td class="label">Propina</td>
      <td class="value">${formatMoney(ticket.propina)}</td>
    </tr>`
        : ''
    }
    <tr class="total-row">
      <td class="label">TOTAL</td>
      <td class="value">${formatMoney(ticket.total)}</td>
    </tr>
  </table>
  ${
    ticket.comentarios
      ? `<div class="sep"></div><div><span class="bold">Notas:</span> ${escapeHtml(ticket.comentarios)}</div>`
      : ''
  }
  <div class="sep"></div>
  <div class="footer">
    ¡Gracias por su compra!<br/>
    Documento informativo — no fiscal
  </div>
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

/**
 * Construye items de ticket a partir del carrito del POS.
 */
export function itemsDesdeCarrito(cart = []) {
  return cart.map((item) => {
    const precio = parseFloat(item.precio) || 0
    const cantidad = item.quantity || 1
    const partesObs = []
    if (item.observaciones) partesObs.push(item.observaciones)
    if (item.tipoPreparacion) partesObs.push(item.tipoPreparacion)
    if (item.tipoLeche) partesObs.push(`Leche: ${item.tipoLeche}`)
    if (item.tipoProteina) partesObs.push(`Proteína: ${item.tipoProteina}`)
    if (item.extras?.length) partesObs.push(`Extras: ${item.extras.join(', ')}`)
    return {
      nombre: item.nombre || item.producto_nombre || 'Producto',
      cantidad,
      precio,
      subtotal: precio * cantidad,
      observaciones: partesObs.length ? partesObs.join(' · ') : null,
    }
  })
}
