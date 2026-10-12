/**
 * Cálculos compartidos por la impresión de cuentas (navegador y térmica).
 */

const centavos = (n) => Math.round((Number(n) || 0) * 100)

/** Reparte un monto según el peso de cada parte, sin perder ni sobrar centavos. */
export function repartirProporcional(monto, pesos) {
  const montoC = centavos(monto)
  const suma = pesos.reduce((acc, p) => acc + p, 0)
  if (!montoC || !suma) return pesos.map(() => 0)
  const partes = pesos.map((p) => Math.floor((montoC * p) / suma))
  let resto = montoC - partes.reduce((acc, p) => acc + p, 0)
  for (let i = 0; resto > 0; i = (i + 1) % partes.length) {
    if (pesos[i] > 0) {
      partes[i] += 1
      resto -= 1
    }
  }
  return partes.map((c) => c / 100)
}

/**
 * Bloques de productos y totales que lleva el ticket. Una cuenta dividida por
 * productos trae un bloque por persona; cualquier otra, uno solo.
 */
export function seccionesTicket(ticket) {
  const cuentas = ticket.division?.modo === 'productos' ? ticket.division.cuentas : null
  if (!cuentas) {
    return [
      {
        items: ticket.items || [],
        subtotal: ticket.subtotal,
        descuento: ticket.descuento,
        propina: ticket.propina,
        total: ticket.total,
      },
    ]
  }
  return cuentas
}

export function fechaHoraTicket(fecha = new Date()) {
  return {
    fecha: fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: fecha.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
  }
}
