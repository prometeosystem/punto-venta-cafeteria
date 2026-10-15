/**
 * Etiqueta del tipo de servicio de una venta o comanda.
 *
 * En la base solo existen 'comer-aqui' y 'para-llevar'; "Delivery" sale del
 * método de pago (Uber/DiDi), que guarda el servicio como 'para-llevar'.
 * 'delivery' y 'para_llevar' como tipo_servicio vienen de datos antiguos.
 */
export const servicioDe = (tipoServicio, metodoPago) => {
  if (metodoPago === 'delivery' || tipoServicio === 'delivery') {
    return { clave: 'delivery', texto: 'Delivery', color: 'text-amber-700' }
  }
  if (tipoServicio === 'para-llevar' || tipoServicio === 'para_llevar') {
    return { clave: 'para-llevar', texto: 'Para llevar', color: 'text-purple-700' }
  }
  if (tipoServicio === 'comer-aqui') {
    return { clave: 'comer-aqui', texto: 'Comer aquí', color: 'text-blue-700' }
  }
  return null
}
