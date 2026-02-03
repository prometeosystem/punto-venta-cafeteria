/**
 * Utilidades para formateo de números
 */

/**
 * Formatea un número agregando comas como separador de miles
 * @param {number|string} num - El número a formatear
 * @param {boolean} includeDecimals - Si incluir decimales (por defecto false)
 * @returns {string} - El número formateado
 */
export const formatNumber = (num, includeDecimals = false) => {
  if (num === null || num === undefined || num === '') {
    return '0';
  }

  // Convertir a número si es string
  const number = typeof num === 'string' ? parseFloat(num) : num;

  if (isNaN(number)) {
    return '0';
  }

  // Para números enteros (cantidades, unidades), no mostrar decimales
  if (!includeDecimals) {
    return Math.floor(number).toLocaleString('en-US');
  }

  // Para precios y montos, mostrar hasta 2 decimales
  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

/**
 * Formatea una cantidad (número entero sin decimales)
 * @param {number|string} num - La cantidad a formatear
 * @returns {string} - La cantidad formateada
 */
export const formatCantidad = (num) => {
  return formatNumber(num, false);
};

/**
 * Formatea un precio o monto (con decimales)
 * @param {number|string} num - El precio a formatear
 * @returns {string} - El precio formateado
 */
export const formatPrecio = (num) => {
  return formatNumber(num, true);
};