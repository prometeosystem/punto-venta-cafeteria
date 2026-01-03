import { useState } from 'react'
import { ventasService } from '../../application/services/ventasService'
import { authService } from '../../application/services/authService'

export const useVentas = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const crearVenta = async (ventaData) => {
    setLoading(true)
    setError(null)
    try {
      const usuario = authService.getStoredUser()
      if (!usuario) {
        throw new Error('Usuario no autenticado')
      }

      const venta = {
        id_cliente: ventaData.id_cliente || null,
        nombre_cliente: ventaData.nombre_cliente || null,
        id_usuario: usuario.id_usuario,
        total: ventaData.total,
        metodo_pago: ventaData.metodo_pago,
        // Campos del modal
        tipo_servicio: ventaData.tipo_servicio || null,
        tipo_leche: ventaData.tipo_leche || null,
        comentarios: ventaData.comentarios || null,
        extra_leche: ventaData.extra_leche || null,
        detalles: ventaData.detalles,
      }

      // Log de depuración
      console.log('📦 Datos de venta a enviar:', venta)
      console.log('📦 nombre_cliente:', venta.nombre_cliente)

      const response = await ventasService.crearVenta(venta)
      return response
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al crear venta'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerVentas = async (fechaInicio = null, fechaFin = null) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ventasService.obtenerVentas(fechaInicio, fechaFin)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener ventas'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerVenta = async (idVenta) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ventasService.obtenerVenta(idVenta)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener venta'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const obtenerInfoTicketActual = async () => {
    setError(null)
    try {
      const data = await ventasService.obtenerInfoTicketActual()
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Error al obtener info del ticket'
      setError(errorMessage)
      throw err
    }
  }

  return {
    loading,
    error,
    crearVenta,
    obtenerVentas,
    obtenerVenta,
    obtenerInfoTicketActual,
  }
}

