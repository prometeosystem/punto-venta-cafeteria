// Mismo valor que CODIGO_DEFAULT en el backend
export const CODIGO_DEFAULT = '123456'

/** Mensaje de error del código, o null si es válido. */
export const problemaCodigo = (codigo, { permitirDefault = true } = {}) => {
  if (!/^\d{6}$/.test(codigo || '')) return 'El código debe ser de 6 dígitos'
  if (new Set(codigo).size === 1) return 'No puede ser el mismo dígito repetido'
  if (!permitirDefault && codigo === CODIGO_DEFAULT) return 'Elige un código distinto al de por defecto'
  return null
}

export const soloDigitos = (valor) => valor.replace(/\D/g, '').slice(0, 6)
