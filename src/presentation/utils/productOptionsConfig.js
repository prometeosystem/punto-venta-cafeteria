/**
 * Opciones de producto, organizadas en grupos.
 *
 * Un grupo ("Agrega Power", "Extras Kids", "Topping Especial") reúne las
 * opciones que se muestran juntas, y cada producto se asigna a los grupos que
 * ofrece. Así un platillo kids tiene sus propios extras y un frappé su topping,
 * en vez de que todos compartan una única lista.
 *
 * El catálogo vive en la base de datos y se edita desde Configuración; aquí se
 * guarda una copia en memoria para que los cálculos de precio sigan siendo
 * funciones síncronas. Los valores de abajo son el respaldo con el que arranca
 * la aplicación y el que se usa si la carga falla.
 */

// Los grupos de leche y proteína tienen su propio bloque en el modal, así que
// no se pintan como una sección más de extras.
export const GRUPO_LECHE = 'leche'
export const GRUPO_PROTEINA = 'proteina'

const GRUPOS_INICIALES = [
  {
    clave: GRUPO_LECHE,
    nombre: 'Tipo de leche',
    seleccion: 'unica',
    obligatorio: true,
    activo: true,
    orden: 1,
    opciones: [
      { clave: 'entera', nombre: 'Entera', precio: 0, activo: true },
      { clave: 'deslactosada', nombre: 'Deslactosada', precio: 15, activo: true },
      { clave: 'almendras', nombre: 'Almendras', precio: 20, activo: true },
    ],
  },
  {
    clave: 'agrega_power',
    nombre: 'Agrega Power',
    seleccion: 'multiple',
    obligatorio: false,
    activo: true,
    orden: 2,
    opciones: [
      { clave: 'huevo', nombre: 'Huevo', precio: 20, activo: true },
      { clave: 'tocino', nombre: 'Tocino', precio: 25, activo: true },
      { clave: 'chistorra', nombre: 'Chistorra', precio: 25, activo: true },
      { clave: 'pollo', nombre: 'Pollo', precio: 30, activo: true },
      { clave: 'aguacate', nombre: 'Aguacate', precio: 30, activo: true },
    ],
  },
  {
    clave: GRUPO_PROTEINA,
    nombre: 'Proteína',
    seleccion: 'multiple',
    obligatorio: false,
    activo: true,
    orden: 3,
    opciones: [{ clave: 'scoop', nombre: 'Scoop de Proteína', precio: 25, activo: true }],
  },
]

let grupos = GRUPOS_INICIALES.map((g) => ({ ...g, opciones: [...g.opciones] }))

// id_producto -> [id_grupo]. Vacío significa que aún no se cargó: en ese caso
// se cae al comportamiento anterior basado en las banderas del producto.
let asignaciones = {}

const porId = () => {
  const mapa = {}
  grupos.forEach((g) => {
    if (g.id_grupo != null) mapa[g.id_grupo] = g
  })
  return mapa
}

/** Reemplaza los grupos con lo que devolvió el backend. */
export function hidratarGruposOpcion(nuevos) {
  if (!Array.isArray(nuevos) || nuevos.length === 0) return
  grupos = nuevos.map((g) => ({
    id_grupo: g.id_grupo,
    clave: g.clave,
    nombre: g.nombre,
    seleccion: g.seleccion === 'unica' ? 'unica' : 'multiple',
    obligatorio: Boolean(g.obligatorio),
    activo: g.activo !== false,
    orden: Number(g.orden) || 0,
    opciones: (g.opciones || []).map((o) => ({
      clave: o.clave,
      nombre: o.nombre,
      precio: Number(o.precio) || 0,
      activo: o.activo !== false,
    })),
  }))
}

/** Guarda qué grupos ofrece cada producto. */
export function hidratarAsignacionesGrupo(mapa) {
  if (!mapa || typeof mapa !== 'object') return
  asignaciones = mapa
}

export const hayAsignacionesCargadas = () => Object.keys(asignaciones).length > 0

const todasLasOpciones = () => grupos.flatMap((g) => g.opciones)

const buscarOpcion = (clave) => todasLasOpciones().find((o) => o.clave === clave) || null

const grupoPorClave = (clave) => grupos.find((g) => g.clave === clave) || null

/**
 * Grupos que ofrece un producto, ya filtrados y listos para pintar.
 * `excluirDedicados` deja fuera leche y proteína, que tienen su propio bloque.
 */
export function getGruposDeProducto(idProducto, { excluirDedicados = true } = {}) {
  const ids = asignaciones[idProducto] || asignaciones[String(idProducto)]
  if (!ids) return []

  const mapa = porId()
  return ids
    .map((id) => mapa[id])
    .filter(Boolean)
    .filter((g) => g.activo)
    .filter((g) => !excluirDedicados || (g.clave !== GRUPO_LECHE && g.clave !== GRUPO_PROTEINA))
    .map((g) => ({
      clave: g.clave,
      nombre: g.nombre,
      seleccion: g.seleccion,
      obligatorio: g.obligatorio,
      opciones: g.opciones
        .filter((o) => o.activo)
        .map((o) => ({ id: o.clave, label: o.nombre, precio: o.precio })),
    }))
    .filter((g) => g.opciones.length > 0)
    .sort((a, b) => a.orden - b.orden)
}

const productoTieneGrupo = (idProducto, claveGrupo) => {
  const ids = asignaciones[idProducto] || asignaciones[String(idProducto)]
  if (!ids) return null // sin datos: que decida la bandera del producto
  const mapa = porId()
  return ids.some((id) => mapa[id]?.clave === claveGrupo && mapa[id]?.activo)
}

export const productoLlevaLeche = (idProducto) => productoTieneGrupo(idProducto, GRUPO_LECHE)
export const productoLlevaProteina = (idProducto) => productoTieneGrupo(idProducto, GRUPO_PROTEINA)

/** Claves de las opciones de un grupo, para saber a cuál pertenece una elección. */
export function getClavesDelGrupo(claveGrupo) {
  return grupoPorClave(claveGrupo)?.opciones.map((o) => o.clave) || []
}

/** Tipos de leche que se ofrecen hoy en el punto de venta. */
export function getLechesDisponibles() {
  const grupo = grupoPorClave(GRUPO_LECHE)
  return (grupo?.opciones || [])
    .filter((o) => o.activo)
    .map((o) => ({ value: o.clave, label: o.nombre, extra: o.precio }))
}

/**
 * Extras de todos los grupos. Solo se usa como respaldo cuando aún no se
 * cargaron las asignaciones por producto.
 */
export function getExtrasDisponibles() {
  return grupos
    .filter((g) => g.activo && g.clave !== GRUPO_LECHE && g.clave !== GRUPO_PROTEINA)
    .flatMap((g) => g.opciones)
    .filter((o) => o.activo)
    .map((o) => ({ id: o.clave, label: o.nombre, precio: o.precio }))
}

export const PROTEINA_SCOOP_PRECIO = 25

export const MENU_CATEGORY_ORDER = [
  'Café Caliente',
  'Bebidas Frías',
  'Frappés',
  'Recovery Bar',
  'Clásicos',
  'Mini WOD',
  'Signature',
]

export function getExtraPrecio(extraId) {
  return buscarOpcion(extraId)?.precio ?? 0
}

export function getNombreExtra(extraId) {
  return buscarOpcion(extraId)?.nombre || extraId
}

export function getNombreLeche(tipoLeche) {
  const grupo = grupoPorClave(GRUPO_LECHE)
  return grupo?.opciones.find((o) => o.clave === tipoLeche)?.nombre || tipoLeche
}

export function getNombreProteina(tipoProteina) {
  if (!tipoProteina) return null
  return 'Scoop de Proteína'
}

export function tieneScoopProteina(tipoProteina) {
  return Boolean(tipoProteina)
}

export function calcPrecioLeche(tipoLeche, quantity = 1) {
  if (!tipoLeche) return 0
  const grupo = grupoPorClave(GRUPO_LECHE)
  const precio = grupo?.opciones.find((o) => o.clave === tipoLeche)?.precio ?? 0
  return precio * quantity
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

const normalizar = (texto) =>
  texto
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()

/**
 * Las observaciones se guardan como texto ("Extras: Tocino, Huevo"), así que
 * para releerlas se compara contra el catálogo completo, incluidas las opciones
 * ya desactivadas: ventas antiguas siguen mencionándolas.
 */
export function parseObservacionesProducto(observaciones) {
  if (!observaciones) {
    return { tipoLeche: null, extras: [], tipoProteina: null, tipoPreparacion: null }
  }

  const texto = normalizar(observaciones)
  let tipoLeche = null
  const extras = []
  let tipoProteina = null
  let tipoPreparacion = null

  if (texto.includes('preparacion: frio')) {
    tipoPreparacion = 'heladas'
  } else if (texto.includes('preparacion: frapeadas')) {
    tipoPreparacion = 'frapeadas'
  }

  const grupoLeche = grupoPorClave(GRUPO_LECHE)
  const leche = (grupoLeche?.opciones || []).find((o) => texto.includes(normalizar(o.nombre)))
  if (leche) tipoLeche = leche.clave

  if (observaciones.includes('Extras:')) {
    const candidatas = grupos
      .filter((g) => g.clave !== GRUPO_LECHE && g.clave !== GRUPO_PROTEINA)
      .flatMap((g) => g.opciones)

    // Se compara cada elemento de la lista por separado y de forma exacta.
    // Buscar por subcadena confundiría opciones con nombres parecidos, como
    // "Tocino" de Agrega Power con "Tocino Kids", que cuestan distinto.
    const listado = (observaciones.split('Extras:')[1] || '').split(' - ')[0]
    listado
      .split(',')
      .map((parte) => normalizar(parte))
      .filter(Boolean)
      .forEach((parte) => {
        const exacta = candidatas.find((o) => normalizar(o.nombre) === parte)
        const elegida = exacta || candidatas.find((o) => parte.includes(normalizar(o.nombre)))
        if (elegida && !extras.includes(elegida.clave)) {
          extras.push(elegida.clave)
        }
      })
  }

  if (texto.includes('proteina:') || texto.includes('scoop:')) {
    tipoProteina = 'scoop'
  }

  return { tipoLeche, extras, tipoProteina, tipoPreparacion }
}

export function buildItemObservaciones(item) {
  const observaciones = []
  if (item.tipoLeche && item.tipoLeche !== 'entera') {
    observaciones.push(`Leche ${getNombreLeche(item.tipoLeche).toLowerCase()}`)
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
