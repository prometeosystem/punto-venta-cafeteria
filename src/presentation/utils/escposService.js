/**
 * Generador ESC/POS para impresoras térmicas portátiles (PT-210, 58mm ~32 chars).
 */

const ESC = 0x1b
const GS = 0x1d
const LF = 0x0a

export const EscPosCommands = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_SIZE: new Uint8Array([GS, 0x21, 0x11]),
  NORMAL_SIZE: new Uint8Array([GS, 0x21, 0x00]),
  CUT_PARTIAL: new Uint8Array([GS, 0x56, 0x01]),
  LINE_FEED: new Uint8Array([LF]),
}

const WIDTH = 32

export const feedLines = (lines = 1) => new Uint8Array([ESC, 0x64, lines])

/** Normaliza acentos a ASCII básico (mejor compatibilidad PT-210). */
export const sanitizeForPrinter = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/gi, (m) => (m === 'Ñ' ? 'N' : 'n'))
    .replace(/[^\x20-\x7E\n]/g, '')

export const textToBytes = (text) => {
  const encoder = new TextEncoder()
  return encoder.encode(sanitizeForPrinter(text))
}

const formatMoney = (n) => {
  const num = Number(n) || 0
  return `$${num.toFixed(2)}`
}

const linePair = (left, right) => {
  const l = sanitizeForPrinter(left)
  const r = sanitizeForPrinter(right)
  const spaces = Math.max(1, WIDTH - l.length - r.length)
  return `${l}${' '.repeat(spaces)}${r}\n`
}

const concatCommands = (commands) => {
  const totalLength = commands.reduce((sum, cmd) => sum + cmd.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const cmd of commands) {
    result.set(cmd, offset)
    offset += cmd.length
  }
  return result
}

const tipoServicioLabel = {
  'comer-aqui': 'Comer aqui',
  'para-llevar': 'Para llevar',
  delivery: 'Delivery',
}

/**
 * Recibo de cafetería para PT-210.
 * @param {Object} ticket
 */
export function generateCafeTicketBytes(ticket = {}) {
  const fecha =
    ticket.fecha ||
    new Date().toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  const negocio = ticket.negocio || 'ZONA 2'
  const lugar = ticket.lugar || 'Zona 2 Coffee Recovery'
  const commands = []

  commands.push(EscPosCommands.INIT)
  commands.push(EscPosCommands.ALIGN_CENTER)
  commands.push(textToBytes('================================\n'))
  commands.push(EscPosCommands.BOLD_ON)
  commands.push(EscPosCommands.DOUBLE_SIZE)
  commands.push(textToBytes(`${negocio}\n`))
  commands.push(EscPosCommands.NORMAL_SIZE)
  commands.push(EscPosCommands.BOLD_OFF)
  commands.push(textToBytes('Cafeteria\n'))
  commands.push(textToBytes(`${lugar}\n`))
  commands.push(textToBytes('================================\n'))

  commands.push(EscPosCommands.ALIGN_LEFT)
  commands.push(textToBytes(`Fecha: ${fecha}\n`))
  if (ticket.numero != null) {
    commands.push(textToBytes(`Ticket #: ${ticket.numero}\n`))
  }
  if (ticket.ticketId) {
    commands.push(textToBytes(`ID: ${ticket.ticketId}\n`))
  }
  if (ticket.cliente) {
    commands.push(textToBytes(`Cliente: ${ticket.cliente}\n`))
  }
  if (ticket.tipoServicio) {
    const svc = tipoServicioLabel[ticket.tipoServicio] || ticket.tipoServicio
    commands.push(textToBytes(`Servicio: ${svc}\n`))
  }
  if (ticket.metodoPago) {
    commands.push(textToBytes(`Pago: ${String(ticket.metodoPago).toUpperCase()}\n`))
  }
  if (ticket.cajero) {
    commands.push(textToBytes(`Atendio: ${ticket.cajero}\n`))
  }

  commands.push(textToBytes('--------------------------------\n'))

  for (const item of ticket.items || []) {
    const cant = item.cantidad || 1
    const nombre = item.nombre || 'Producto'
    const sub = item.subtotal ?? Number(item.precio) * Number(cant)
    const left = `${cant}x ${nombre}`
    const truncated = left.length > 20 ? `${left.slice(0, 17)}...` : left
    commands.push(textToBytes(linePair(truncated, formatMoney(sub))))
    if (item.observaciones) {
      commands.push(textToBytes(`  ${item.observaciones}\n`))
    }
  }

  commands.push(textToBytes('--------------------------------\n'))
  commands.push(textToBytes(linePair('Subtotal', formatMoney(ticket.subtotal))))
  if (Number(ticket.propina) > 0) {
    commands.push(textToBytes(linePair('Propina', formatMoney(ticket.propina))))
  }
  if (Number(ticket.descuento) > 0) {
    commands.push(textToBytes(linePair('Descuento', `-${formatMoney(ticket.descuento).slice(1)}`)))
  }
  commands.push(EscPosCommands.BOLD_ON)
  commands.push(textToBytes(linePair('TOTAL', formatMoney(ticket.total))))
  commands.push(EscPosCommands.BOLD_OFF)

  if (ticket.comentarios) {
    commands.push(textToBytes('--------------------------------\n'))
    commands.push(textToBytes(`Notas: ${ticket.comentarios}\n`))
  }

  commands.push(EscPosCommands.ALIGN_CENTER)
  commands.push(textToBytes('================================\n'))
  commands.push(EscPosCommands.BOLD_ON)
  commands.push(textToBytes('Gracias por su visita\n'))
  commands.push(EscPosCommands.BOLD_OFF)
  commands.push(textToBytes('================================\n'))
  commands.push(feedLines(3))
  commands.push(EscPosCommands.CUT_PARTIAL)

  return concatCommands(commands)
}

export function generateTestPrintBytes() {
  return concatCommands([
    EscPosCommands.INIT,
    EscPosCommands.ALIGN_CENTER,
    EscPosCommands.BOLD_ON,
    textToBytes('=== PRUEBA PT-210 ===\n\n'),
    EscPosCommands.BOLD_OFF,
    textToBytes('ZONA 2 - Cafeteria\n'),
    textToBytes('Impresora conectada\n'),
    textToBytes(`${new Date().toLocaleString('es-MX')}\n`),
    feedLines(3),
    EscPosCommands.CUT_PARTIAL,
  ])
}

export default {
  EscPosCommands,
  feedLines,
  textToBytes,
  generateCafeTicketBytes,
  generateTestPrintBytes,
}
