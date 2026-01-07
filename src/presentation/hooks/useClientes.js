import { useState, useEffect } from 'react'
import { clientesService } from '../../application/services/clientesService'

export const useClientes = () => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerClientes = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await clientesService.obtenerClientes()
      setClientes(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al obtener clientes')
      console.error('Error al obtener clientes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerClientes()
  }, [])

  const crearCliente = async (clienteData) => {
    try {
      const response = await clientesService.crearCliente(clienteData)
      await obtenerClientes() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const editarCliente = async (idCliente, clienteData) => {
    try {
      const response = await clientesService.editarCliente(idCliente, clienteData)
      await obtenerClientes() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    clientes,
    loading,
    error,
    obtenerClientes,
    crearCliente,
    editarCliente,
  }
}


