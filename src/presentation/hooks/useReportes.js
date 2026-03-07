import { useState } from 'react'
import { reportesService } from '../../application/services/reportesService'

export const useReportes = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerVentasPorDia = async (fechaInicio, fechaFin) => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportesService.obtenerVentasPorDia(fechaInicio, fechaFin)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener ventas por día'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerProductosMasVendidos = async (fechaInicio, fechaFin, limite = 10) => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportesService.obtenerProductosMasVendidos(fechaInicio, fechaFin, limite)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener productos más vendidos'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerComprasRecomendadas = async (mesesAnalisis = 3) => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportesService.obtenerComprasRecomendadas(mesesAnalisis)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener recomendaciones de compra'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerPropinasPorFecha = async (fechaInicio, fechaFin) => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportesService.obtenerPropinasPorFecha(fechaInicio, fechaFin)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener propinas'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerDescuentosPorFecha = async (fechaInicio, fechaFin) => {
    setLoading(true)
    setError(null)
    try {
      const data = await reportesService.obtenerDescuentosPorFecha(fechaInicio, fechaFin)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener descuentos'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    obtenerVentasPorDia,
    obtenerProductosMasVendidos,
    obtenerComprasRecomendadas,
    obtenerPropinasPorFecha,
    obtenerDescuentosPorFecha
  }
}

