import { useState } from 'react'
import { bitacoraService } from '../../application/services/bitacoraService'

export const useBitacora = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerBitacora = async (filtros = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await bitacoraService.obtenerBitacora(filtros)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener bitácora'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerBitacoraPorId = async (idBitacora) => {
    setLoading(true)
    setError(null)
    try {
      const data = await bitacoraService.obtenerBitacoraPorId(idBitacora)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener registro'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    obtenerBitacora,
    obtenerBitacoraPorId,
  }
}
