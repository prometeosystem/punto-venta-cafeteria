import { useState, useEffect } from 'react'
import { usuariosService } from '../../application/services/usuariosService'

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const obtenerUsuarios = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await usuariosService.obtenerUsuarios()
      setUsuarios(data)
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al obtener usuarios')
      console.error('Error al obtener usuarios:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    obtenerUsuarios()
  }, [])

  const crearUsuario = async (usuarioData) => {
    try {
      const response = await usuariosService.crearUsuario(usuarioData)
      await obtenerUsuarios() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const editarUsuario = async (idUsuario, usuarioData) => {
    try {
      const response = await usuariosService.editarUsuario(idUsuario, usuarioData)
      await obtenerUsuarios() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const eliminarUsuario = async (idUsuario) => {
    try {
      const response = await usuariosService.eliminarUsuario(idUsuario)
      await obtenerUsuarios() // Refrescar lista
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    usuarios,
    loading,
    error,
    obtenerUsuarios,
    crearUsuario,
    editarUsuario,
    eliminarUsuario,
  }
}

