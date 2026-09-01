import { useState, useEffect, useCallback } from 'react'
import { cajaService } from '../../application/services/cajaService'

export const useCaja = (pollingInterval = 10000) => {
  const [estado, setEstado] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargarEstado = useCallback(async () => {
    try {
      const data = await cajaService.obtenerCajaActual()
      setEstado(data)
      setError(null)
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message ||
        'Error al consultar caja'
      setError(typeof message === 'string' ? message : 'Error al consultar caja')
      setEstado((prev) => prev ?? { abierta: false, sesion: null, _error: true })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarEstado()
    if (pollingInterval > 0) {
      const interval = setInterval(cargarEstado, pollingInterval)
      return () => clearInterval(interval)
    }
  }, [cargarEstado, pollingInterval])

  const abrirCaja = async (data) => {
    try {
      const result = await cajaService.abrirCaja(data)
      if (!result.error) await cargarEstado()
      // Si ya existe caja abierta, refrescar estado para no quedar en pantalla de apertura
      if (result.error && /ya existe una caja abierta/i.test(result.error)) {
        await cargarEstado()
      }
      return result
    } catch (err) {
      const isNetwork =
        err.code === 'ERR_NETWORK' ||
        err.message === 'Network Error' ||
        (!err.response && !!err.request)
      const message = isNetwork
        ? 'No se pudo conectar con el servidor. Verifica que el backend esté encendido (puerto 8000) e intenta de nuevo.'
        : (
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          'Error al abrir caja'
        )
      return { error: typeof message === 'string' ? message : 'Error al abrir caja' }
    }
  }

  const cerrarCaja = async (idSesion, data) => {
    try {
      const result = await cajaService.cerrarCaja(idSesion, data)
      if (!result.error) await cargarEstado()
      return result
    } catch (err) {
      const isNetwork =
        err.code === 'ERR_NETWORK' ||
        err.message === 'Network Error' ||
        (!err.response && !!err.request)
      const message = isNetwork
        ? 'No se pudo conectar con el servidor. Verifica que el backend esté encendido (puerto 8000) e intenta de nuevo.'
        : (
          err.response?.data?.detail ||
          err.response?.data?.error ||
          err.message ||
          'Error al cerrar caja'
        )
      return { error: typeof message === 'string' ? message : 'Error al cerrar caja' }
    }
  }

  return { estado, loading, error, cargarEstado, abrirCaja, cerrarCaja }
}
