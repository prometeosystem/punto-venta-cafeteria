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
      // Asegurar id_usuario (backend puede devolver snake_case; algunos stores usan camelCase)
      const idUsuario = usuario.id_usuario ?? usuario.idUsuario
      if (idUsuario == null || idUsuario === '') {
        throw new Error('Sesión incompleta: falta id de usuario. Vuelve a iniciar sesión.')
      }

      // Sanitizar id_cliente y total para evitar enviar strings inválidos al backend
      const idClienteRaw = ventaData.id_cliente
      const id_cliente = idClienteRaw != null && String(idClienteRaw).match(/^\d+$/) ? Number(idClienteRaw) : null
      const total = parseFloat(String(ventaData.total).replace(/,/g, '')) || 0

      const venta = {
        id_cliente,
        nombre_cliente: ventaData.nombre_cliente != null ? String(ventaData.nombre_cliente).trim() || null : null,
        id_usuario: Number(idUsuario),
        total,
        metodo_pago: ventaData.metodo_pago,
        tipo_servicio: ventaData.tipo_servicio || null,
        tipo_leche: ventaData.tipo_leche || null,
        comentarios: ventaData.comentarios || null,
        extra_leche: ventaData.extra_leche ?? null,
        detalles: ventaData.detalles,
        descuento_tipo: ventaData.descuento_tipo ?? null,
        descuento_valor: ventaData.descuento_valor != null ? parseFloat(ventaData.descuento_valor) : null,
        total_descuento: ventaData.total_descuento != null ? parseFloat(ventaData.total_descuento) : null,
        pagada: ventaData.pagada !== undefined ? ventaData.pagada : true,
      }

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

  const procesarPagoVenta = async (idVenta, body) => {
    setLoading(true)
    setError(null)
    try {
      const data = await ventasService.procesarPagoVenta(idVenta, body)
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || 'Error al procesar pago'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    crearVenta,
    obtenerVentas,
    obtenerVenta,
    obtenerInfoTicketActual,
    procesarPagoVenta,
  }
}

