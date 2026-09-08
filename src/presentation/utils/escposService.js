/**
 * Generador ESC/POS para impresoras térmicas (58mm y 80mm).
 */
import logoTicketUrl from '../../assets/logo-ticket.png'

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

/** Caracteres por línea y puntos imprimibles según el ancho de papel (fuente A). */
export const PAPER_PROFILES = {
  '58': { charsPerLine: 32, dots: 384, label: '58 mm' },
  '80': { charsPerLine: 48, dots: 576, label: '80 mm' },
}

/**
 * Avance final antes del corte. La cabeza térmica está varios milímetros por
 * dentro de la barra de corte, así que sin este avance lo último impreso queda
 * atorado en el mecanismo y se corta a la mitad.
 */
export const FEED_FINAL = 5

/**
 * Qué tanto del ancho del papel ocupa el logo del encabezado.
 * El logo es un banner alargado (más de 3:1), así que necesita buena parte del
 * ancho para que el eslogan salga legible en papel térmico.
 */
const LOGO_ANCHO_RELATIVO = 0.72

export const DEFAULT_PAPER = '80'

const PAPER_STORAGE_KEY = 'zona2_paper_width'

export const getPaperWidth = () => {
  try {
    const saved = localStorage.getItem(PAPER_STORAGE_KEY)
    return PAPER_PROFILES[saved] ? saved : DEFAULT_PAPER
  } catch {
    return DEFAULT_PAPER
  }
}

export const setPaperWidth = (width) => {
  if (!PAPER_PROFILES[width]) return false
  localStorage.setItem(PAPER_STORAGE_KEY, width)
  return true
}

const charsFor = (paperWidth) =>
  (PAPER_PROFILES[paperWidth] || PAPER_PROFILES[DEFAULT_PAPER]).charsPerLine

const dotsFor = (paperWidth) =>
  (PAPER_PROFILES[paperWidth] || PAPER_PROFILES[DEFAULT_PAPER]).dots

export const feedLines = (lines = 1) => new Uint8Array([ESC, 0x64, lines])

/** Normaliza acentos a ASCII básico (mejor compatibilidad con estas térmicas). */
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

const separator = (char, width) => `${char.repeat(width)}\n`

const linePair = (left, right, width) => {
  const l = sanitizeForPrinter(left)
  const r = sanitizeForPrinter(right)
  const spaces = Math.max(1, width - l.length - r.length)
  return `${l}${' '.repeat(spaces)}${r}\n`
}

/** Recorta el texto para que quepa junto al importe en la misma línea. */
const fitLeft = (text, right, width) => {
  const max = width - right.length - 1
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(1, max - 3))}...`
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

const cargarImagen = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen del ticket'))
    img.src = src
  })

/**
 * Convierte una imagen a un mapa de bits ESC/POS (GS v 0).
 * El escalado lo hace el canvas con suavizado y el umbral se aplica después,
 * para que las curvas del logo no salgan dentadas.
 */
export const imageToRasterBytes = (img, anchoObjetivo, umbral = 160) => {
  const anchoOriginal = img.naturalWidth || img.width
  const altoOriginal = img.naturalHeight || img.height
  if (!anchoOriginal || !altoOriginal) return null

  // El formato raster empaqueta 8 puntos por byte, el ancho debe ser múltiplo de 8
  const ancho = Math.max(8, Math.floor(anchoObjetivo / 8) * 8)
  const alto = Math.max(1, Math.round(altoOriginal * (ancho / anchoOriginal)))

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ancho, alto)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, ancho, alto)

  const { data } = ctx.getImageData(0, 0, ancho, alto)
  const bytesPorFila = ancho / 8
  const bitmap = new Uint8Array(bytesPorFila * alto)

  for (let y = 0; y < alto; y += 1) {
    for (let x = 0; x < ancho; x += 1) {
      const i = (y * ancho + x) * 4
      const gris =
        data[i + 3] === 0
          ? 255
          : data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
      if (gris < umbral) {
        bitmap[y * bytesPorFila + (x >> 3)] |= 0x80 >> (x & 7)
      }
    }
  }

  const encabezado = new Uint8Array([
    GS, 0x76, 0x30, 0x00,
    bytesPorFila & 0xff, (bytesPorFila >> 8) & 0xff,
    alto & 0xff, (alto >> 8) & 0xff,
  ])

  return concatCommands([encabezado, bitmap])
}

const logoCache = new Map()

/** Logo del ticket ya convertido a bytes, memorizado por ancho de papel. */
export const getLogoRasterBytes = async (paperWidth = getPaperWidth()) => {
  const clave = String(paperWidth)
  if (logoCache.has(clave)) return logoCache.get(clave)

  let bytes = null
  try {
    const img = await cargarImagen(logoTicketUrl)
    bytes = imageToRasterBytes(img, dotsFor(clave) * LOGO_ANCHO_RELATIVO)
  } catch {
    bytes = null
  }
  logoCache.set(clave, bytes)
  return bytes
}

const tipoServicioLabel = {
  'comer-aqui': 'Comer aqui',
  'para-llevar': 'Para llevar',
  delivery: 'Delivery',
}

/** Porcentaje sugerido de propina en la cuenta. */
export const PROPINA_SUGERIDA_PCT = 10

/**
 * Recibo de cafetería.
 * @param {Object} ticket
 * @param {'cuenta'|'venta'} [ticket.tipo] 'cuenta' se entrega antes de pagar.
 * @param {Object} [options]
 * @param {'58'|'80'} [options.paperWidth]
 */
export function generateCafeTicketBytes(ticket = {}, options = {}) {
  const width = charsFor(options.paperWidth || getPaperWidth())
  const esCuenta = ticket.tipo === 'cuenta'
  const fecha =
    ticket.fecha ||
    new Date().toLocaleString('es-MX', {
      dateStyle: 'short',
      timeStyle: 'short',
    })

  const negocio = ticket.negocio || 'ZONA 2'
  const lugar = ticket.lugar || 'Brunch and Run'
  const commands = []

  commands.push(EscPosCommands.INIT)
  commands.push(EscPosCommands.ALIGN_CENTER)
  if (options.logoBytes) {
    commands.push(options.logoBytes)
    commands.push(EscPosCommands.LINE_FEED)
  } else {
    // Sin logo el ticket sigue saliendo, con el nombre en texto
    commands.push(EscPosCommands.BOLD_ON)
    commands.push(EscPosCommands.DOUBLE_SIZE)
    commands.push(textToBytes(`${negocio}\n`))
    commands.push(EscPosCommands.NORMAL_SIZE)
    commands.push(EscPosCommands.BOLD_OFF)
    commands.push(textToBytes(`${lugar}\n`))
  }
  commands.push(textToBytes(separator('=', width)))

  commands.push(EscPosCommands.ALIGN_LEFT)
  commands.push(textToBytes(`${fecha}\n`))
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
  if (ticket.metodoPago && !esCuenta) {
    commands.push(textToBytes(`Pago: ${String(ticket.metodoPago).toUpperCase()}\n`))
  }
  if (ticket.cajero) {
    commands.push(textToBytes(`Atendio: ${ticket.cajero}\n`))
  }

  commands.push(textToBytes(separator('-', width)))

  for (const item of ticket.items || []) {
    const cant = item.cantidad || 1
    const nombre = item.nombre || 'Producto'
    const sub = item.subtotal ?? Number(item.precio) * Number(cant)
    const importe = formatMoney(sub)
    const left = fitLeft(`${cant}x ${nombre}`, importe, width)
    commands.push(textToBytes(linePair(left, importe, width)))
    if (item.observaciones) {
      commands.push(textToBytes(`  ${item.observaciones}\n`))
    }
  }

  commands.push(textToBytes(separator('-', width)))
  commands.push(textToBytes(linePair('Subtotal', formatMoney(ticket.subtotal), width)))
  if (Number(ticket.propina) > 0) {
    commands.push(textToBytes(linePair('Propina', formatMoney(ticket.propina), width)))
  }
  if (Number(ticket.descuento) > 0) {
    commands.push(
      textToBytes(linePair('Descuento', `-${formatMoney(ticket.descuento).slice(1)}`, width))
    )
  }
  commands.push(EscPosCommands.BOLD_ON)
  commands.push(textToBytes(linePair('TOTAL', formatMoney(ticket.total), width)))
  commands.push(EscPosCommands.BOLD_OFF)

  // La sugerencia se omite si el cliente ya definió propina en el sistema.
  if (esCuenta && !(Number(ticket.propina) > 0)) {
    const sugerida = (Number(ticket.total) || 0) * (PROPINA_SUGERIDA_PCT / 100)
    commands.push(textToBytes(separator('-', width)))
    commands.push(
      textToBytes(linePair(`Propina sugerida ${PROPINA_SUGERIDA_PCT}%`, formatMoney(sugerida), width))
    )
  }

  if (ticket.comentarios) {
    commands.push(textToBytes(separator('-', width)))
    commands.push(textToBytes(`Notas: ${ticket.comentarios}\n`))
  }

  commands.push(EscPosCommands.ALIGN_CENTER)
  commands.push(textToBytes(separator('=', width)))
  commands.push(EscPosCommands.BOLD_ON)
  commands.push(textToBytes('Gracias por su visita\n'))
  commands.push(EscPosCommands.BOLD_OFF)
  commands.push(feedLines(FEED_FINAL))
  commands.push(EscPosCommands.CUT_PARTIAL)

  return concatCommands(commands)
}

/**
 * Igual que generateCafeTicketBytes, pero resuelve el logo por su cuenta.
 * Si el logo no carga, el ticket sale con el texto de despedida.
 */
export async function generateCafeTicketBytesAsync(ticket = {}, options = {}) {
  const paperWidth = options.paperWidth || getPaperWidth()
  const logoBytes =
    options.logoBytes !== undefined ? options.logoBytes : await getLogoRasterBytes(paperWidth)
  return generateCafeTicketBytes(ticket, { ...options, paperWidth, logoBytes })
}

export function generateTestPrintBytes(options = {}) {
  const paperWidth = options.paperWidth || getPaperWidth()
  const width = charsFor(paperWidth)
  const perfil = PAPER_PROFILES[paperWidth] || PAPER_PROFILES[DEFAULT_PAPER]

  return concatCommands([
    EscPosCommands.INIT,
    EscPosCommands.ALIGN_CENTER,
    EscPosCommands.BOLD_ON,
    textToBytes('=== PRUEBA DE IMPRESION ===\n\n'),
    EscPosCommands.BOLD_OFF,
    textToBytes('ZONA 2 - Cafeteria\n'),
    textToBytes('Impresora conectada\n'),
    textToBytes(`Papel: ${perfil.label} (${width} col)\n`),
    textToBytes(`${new Date().toLocaleString('es-MX')}\n`),
    EscPosCommands.ALIGN_LEFT,
    textToBytes(separator('-', width)),
    textToBytes(linePair('Alineacion derecha', 'OK', width)),
    textToBytes(separator('=', width)),
    feedLines(FEED_FINAL),
    EscPosCommands.CUT_PARTIAL,
  ])
}

export default {
  EscPosCommands,
  PAPER_PROFILES,
  DEFAULT_PAPER,
  FEED_FINAL,
  getPaperWidth,
  setPaperWidth,
  feedLines,
  textToBytes,
  imageToRasterBytes,
  getLogoRasterBytes,
  generateCafeTicketBytes,
  generateCafeTicketBytesAsync,
  generateTestPrintBytes,
}
