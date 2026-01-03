import { useState } from 'react'
import { preordenesService } from '../../application/services/preordenesService'

export const usePreordenes = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerPreordenes = async (estado = null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await preordenesService.obtenerPreordenes(estado)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener pre-órdenes'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const crearPreorden = async (preordenData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await preordenesService.crearPreorden(preordenData)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear pre-orden'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const procesarPago = async (idPreorden, pagoData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await preordenesService.procesarPago(idPreorden, pagoData)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al procesar pago'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const actualizarPreorden = async (idPreorden, preordenData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await preordenesService.actualizarPreorden(idPreorden, preordenData)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar pre-orden'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const marcarLista = async (idPreorden) => {
    setLoading(true)
    setError(null)
    try {
      const response = await preordenesService.marcarLista(idPreorden)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al marcar como lista'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const marcarEntregada = async (idPreorden) => {
    setLoading(true)
    setError(null)
    try {
      const response = await preordenesService.marcarEntregada(idPreorden)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al marcar como entregada'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    obtenerPreordenes,
    crearPreorden,
    procesarPago,
    actualizarPreorden,
    marcarLista,
    marcarEntregada,
  }
}

