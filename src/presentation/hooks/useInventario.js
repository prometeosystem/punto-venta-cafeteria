import { useState, useEffect } from 'react'
import { inventarioService } from '../../application/services/inventarioService'

export const useInventario = () => {
  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerInsumos = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await inventarioService.obtenerInsumos()
      setInsumos(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al obtener insumos')
      console.error('Error al obtener insumos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerInsumos()
  }, [])

  const crearInsumo = async (insumoData) => {
    try {
      const response = await inventarioService.crearInsumo(insumoData)
      await obtenerInsumos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const editarInsumo = async (idInsumo, insumoData) => {
    try {
      const response = await inventarioService.editarInsumo(idInsumo, insumoData)
      await obtenerInsumos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const registrarMovimiento = async (movimientoData) => {
    try {
      const response = await inventarioService.registrarMovimiento(movimientoData)
      await obtenerInsumos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const obtenerInsumosBajoStock = async () => {
    try {
      const data = await inventarioService.obtenerInsumosBajoStock()
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    insumos,
    loading,
    error,
    obtenerInsumos,
    crearInsumo,
    editarInsumo,
    registrarMovimiento,
    obtenerInsumosBajoStock,
  }
}




