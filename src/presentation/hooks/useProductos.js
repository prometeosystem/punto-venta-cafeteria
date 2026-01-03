import { useState, useEffect } from 'react'
import { productosService } from '../../application/services/productosService'

export const useProductos = () => {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerProductos = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await productosService.obtenerProductos()
      setProductos(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al obtener productos')
      console.error('Error al obtener productos:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerProductos()
  }, [])

  const crearProducto = async (productoData) => {
    try {
      const response = await productosService.crearProducto(productoData)
      await obtenerProductos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const editarProducto = async (idProducto, productoData) => {
    try {
      const response = await productosService.editarProducto(idProducto, productoData)
      await obtenerProductos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const eliminarProducto = async (idProducto) => {
    try {
      const response = await productosService.eliminarProducto(idProducto)
      await obtenerProductos() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const obtenerProducto = async (idProducto) => {
    try {
      const data = await productosService.obtenerProducto(idProducto)
      return data
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    productos,
    loading,
    error,
    obtenerProductos,
    obtenerProducto,
    crearProducto,
    editarProducto,
    eliminarProducto,
  }
}

