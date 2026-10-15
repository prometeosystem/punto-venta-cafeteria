import marca from '@marca'
import { clave } from './almacenLocal'

const STORAGE_KEY = clave('pos_fotos')

export function obtenerPosConFotos() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function guardarPosConFotos(activo) {
  const valor = activo ? '1' : '0'
  localStorage.setItem(STORAGE_KEY, valor)
  window.dispatchEvent(new CustomEvent('pos-fotos-changed', { detail: activo }))
  return activo
}

const DB_NAME = marca.almacen.baseImagenes
const STORE = 'imagenes'
const memoria = new Map()
const enCurso = new Map()
let dbPromise = null

function abrirCache() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

function leerRegistro(url) {
  return abrirCache().then((db) => new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(url)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror = () => reject(req.error)
  }))
}

function guardarRegistro(url, valor) {
  return abrirCache().then((db) => new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).put(valor, url)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  }))
}

function recordar(url, valor) {
  memoria.set(url, valor)
  return valor
}

// Devuelve un object URL de la foto guardada, o null si no existe.
// Solo va a la red la primera vez: después sale de la memoria o de IndexedDB.
export function obtenerImagenCacheada(url) {
  if (!url) return Promise.resolve(null)
  if (memoria.has(url)) return Promise.resolve(memoria.get(url))
  if (enCurso.has(url)) return enCurso.get(url)

  const tarea = (async () => {
    try {
      const guardado = await leerRegistro(url)
      if (guardado?.miss) return recordar(url, null)
      if (guardado?.blob) return recordar(url, URL.createObjectURL(guardado.blob))

      const respuesta = await fetch(url)
      if (!respuesta.ok) {
        await guardarRegistro(url, { miss: true })
        return recordar(url, null)
      }
      const blob = await respuesta.blob()
      await guardarRegistro(url, { blob })
      return recordar(url, URL.createObjectURL(blob))
    } catch {
      return null
    } finally {
      enCurso.delete(url)
    }
  })()

  enCurso.set(url, tarea)
  return tarea
}

export async function vaciarCacheImagenes() {
  memoria.clear()
  enCurso.clear()
  const db = await abrirCache()
  await new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readwrite').objectStore(STORE).clear()
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
  window.dispatchEvent(new CustomEvent('pos-fotos-cache-cleared'))
}
