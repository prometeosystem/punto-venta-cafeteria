import { useState } from 'react'
import { comandasService } from '../../application/services/comandasService'

export const useComandas = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerComandas = async (estado = null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await comandasService.obtenerComandas(estado)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener comandas'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const crearComanda = async (comandaData) => {
    setLoading(true)
    setError(null)
    try {
      const response = await comandasService.crearComanda(comandaData)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear comanda'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const actualizarEstado = async (idComanda, nuevoEstado) => {
    setLoading(true)
    setError(null)
    try {
      const response = await comandasService.actualizarEstadoComanda(idComanda, nuevoEstado)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al actualizar estado'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    obtenerComandas,
    crearComanda,
    actualizarEstado,
  }
}


