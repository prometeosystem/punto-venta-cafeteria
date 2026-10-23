import assert from 'node:assert/strict'
import test from 'node:test'
import { comoLista, debeAvisarErrorDeCarga, mensajeCargaComandas } from './comandasLista.js'

test('una lista vacía no es un error', () => {
  assert.deepEqual(comoLista([]), [])
  assert.deepEqual([...comoLista([]), ...comoLista([])], [])
})

test('un objeto de error no se trata como lista de comandas', () => {
  assert.throws(
    () => comoLista({ error: 'Error de conexión a la base de datos' }),
    { message: 'Error de conexión a la base de datos' },
  )
})

test('el aviso solo sale en la carga inicial', () => {
  assert.equal(debeAvisarErrorDeCarga(false), true)
  assert.equal(debeAvisarErrorDeCarga(true), false)
})

test('el mensaje usa el detalle del servidor', () => {
  const error = { response: { data: { detail: 'Error al listar comandas: mesas' } }, message: 'Request failed' }
  assert.equal(mensajeCargaComandas(error), 'Error al listar comandas: mesas')
  assert.equal(mensajeCargaComandas(new Error('falló la red')), 'falló la red')
})
