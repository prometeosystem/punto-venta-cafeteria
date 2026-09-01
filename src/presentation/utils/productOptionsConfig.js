/** Precios y opciones de producto (leche, extras, proteína) — Zona 2 WOD */

export const LECHE_PRECIOS = {
  deslactosada: 15,
  almendras: 20,
}

export const EXTRAS_DISPONIBLES = [
  { id: 'huevo', label: 'Huevo', precio: 20 },
  { id: 'tocino', label: 'Tocino', precio: 25 },
  { id: 'chistorra', label: 'Chistorra', precio: 25 },
]

export const EXTRAS_NOMBRES = {
  huevo: 'Huevo',
  tocino: 'Tocino',
  chistorra: 'Chistorra',
  jamon: 'Jamón',
  chorizo: 'Chorizo',
}

export const EXTRAS_PRECIOS = {
  huevo: 20,
  tocino: 25,
  chistorra: 25,
  jamon: 25,
  chorizo: 25,
}

export const PROTEINA_SCOOP_PRECIO = 25

export const MENU_CATEGORY_ORDER = [
  'Café Caliente',
  'Bebidas Frías',
  'Frappés',
  'Recovery Bar',
  'Clásicos',
  'Agrega Power',
  'Mini WOD',
  'Signature',
]

export function getExtraPrecio(extraId) {
  return EXTRAS_PRECIOS[extraId] ?? 0
}

export function getNombreExtra(extraId) {
  return EXTRAS_NOMBRES[extraId] || extraId
}

export function getNombreProteina(tipoProteina) {
  if (!tipoProteina) return null
  return 'Scoop de Proteína'
}

export function tieneScoopProteina(tipoProteina) {
  return Boolean(tipoProteina)
}

export function calcPrecioLeche(tipoLeche, quantity = 1) {
  if (!tipoLeche || tipoLeche === 'entera') return 0
  return (LECHE_PRECIOS[tipoLeche] ?? 0) * quantity
}

export function calcPrecioExtras(extras = [], quantity = 1) {
  if (!extras?.length) return 0
  const unit = extras.reduce((sum, id) => sum + getExtraPrecio(id), 0)
  return unit * quantity
}

export function calcPrecioProteina(tipoProteina, quantity = 1) {
  if (!tipoProteina) return 0
  return PROTEINA_SCOOP_PRECIO * quantity
}

export function calcOpcionesItemTotal(item) {
  const qty = item.quantity ?? 1
  return (
    calcPrecioLeche(item.tipoLeche, qty) +
    calcPrecioExtras(item.extras, qty) +
    calcPrecioProteina(item.tipoProteina, qty)
  )
}

export function desglosarExtrasCarrito(items) {
  return items.reduce(
    (acc, item) => {
      const qty = item.quantity ?? 1
      acc.extraLeche += calcPrecioLeche(item.tipoLeche, qty)
      acc.extraExtras += calcPrecioExtras(item.extras, qty)
      acc.extraProteina += calcPrecioProteina(item.tipoProteina, qty)
      return acc
    },
    { extraLeche: 0, extraExtras: 0, extraProteina: 0 }
  )
}

export function sortMenuCategories(categories) {
  return [...categories].sort((a, b) => {
    const ia = MENU_CATEGORY_ORDER.indexOf(a)
    const ib = MENU_CATEGORY_ORDER.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, 'es')
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export function parseObservacionesProducto(observaciones) {
  if (!observaciones) {
    return { tipoLeche: null, extras: [], tipoProteina: null, tipoPreparacion: null }
  }

  let tipoLeche = null
  const extras = []
  let tipoProteina = null
  let tipoPreparacion = null

  if (observaciones.includes('Preparación: Frío') || observaciones.includes('Preparación: Frio')) {
    tipoPreparacion = 'heladas'
  } else if (observaciones.includes('Preparación: Frapeadas')) {
    tipoPreparacion = 'frapeadas'
  }

  if (observaciones.includes('Leche deslactosada') || observaciones.includes('deslactosada')) {
    tipoLeche = 'deslactosada'
  } else if (observaciones.includes('Leche de almendras') || observaciones.includes('almendras')) {
    tipoLeche = 'almendras'
  } else if (observaciones.includes('entera')) {
    tipoLeche = 'entera'
  }

  const mapaExtras = {
    Tocino: 'tocino',
    tocino: 'tocino',
    Huevo: 'huevo',
    huevo: 'huevo',
    Chistorra: 'chistorra',
    chistorra: 'chistorra',
    Jamón: 'jamon',
    jamón: 'jamon',
    jamon: 'jamon',
    Chorizo: 'chorizo',
    chorizo: 'chorizo',
  }

  if (observaciones.includes('Extras:')) {
    const extrasPart = observaciones.split('Extras:')[1]
    if (extrasPart) {
      const extrasList = extrasPart.split(/[,-]/).map((e) => e.trim())
      extrasList.forEach((extra) => {
        if (extra.includes('Proteína:') || extra.includes('Proteina:') || extra.includes('Scoop:')) return
        const extraId = mapaExtras[extra]
        if (extraId && !extras.includes(extraId)) extras.push(extraId)
      })
    }
  }

  if (
    observaciones.includes('Proteína:') ||
    observaciones.includes('Proteina:') ||
    observaciones.includes('Scoop:')
  ) {
    tipoProteina = 'scoop'
  }

  return { tipoLeche, extras, tipoProteina, tipoPreparacion }
}

export function buildItemObservaciones(item) {
  const observaciones = []
  if (item.tipoLeche && item.tipoLeche !== 'entera') {
    if (item.tipoLeche === 'deslactosada') observaciones.push('Leche deslactosada')
    else if (item.tipoLeche === 'almendras') observaciones.push('Leche de almendras')
  }
  if (item.extras?.length) {
    observaciones.push(`Extras: ${item.extras.map(getNombreExtra).join(', ')}`)
  }
  if (item.tipoProteina) {
    observaciones.push('Scoop: Scoop de Proteína')
  }
  return observaciones.length > 0 ? observaciones.join(' - ') : null
}

export function calcPrecioOpcionesProducto(precioBase, opciones) {
  const base = parseFloat(precioBase) || 0
  return (
    base +
    calcPrecioLeche(opciones.tipoLeche) +
    calcPrecioExtras(opciones.extras) +
    calcPrecioProteina(opciones.tipoProteina)
  )
}
