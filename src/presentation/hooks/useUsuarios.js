import { useState, useEffect } from 'react'
import { usuariosService } from '../../application/services/usuariosService'

export const useUsuarios = () => {
  const [usuarios, setUsuarios] = useState([])
  const [estadisticas, setEstadisticas] = useState(null)
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

  const obtenerEstadisticas = async () => {
    try {
      const data = await usuariosService.obtenerEstadisticas()
      setEstadisticas(data)
      return data
    } catch (err) {
      console.error('Error al obtener estadísticas:', err)
      // No lanzar error, simplemente no actualizar las estadísticas
      return null
    }
  }

  useEffect(() => {
    obtenerUsuarios()
    obtenerEstadisticas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const crearUsuario = async (usuarioData) => {
    try {
      // Asegurarse de que la contraseña sea un string simple antes de enviar
      let datosLimpios = { ...usuarioData }
      
      if (datosLimpios.contrasena && typeof datosLimpios.contrasena === 'object') {
        datosLimpios.contrasena = datosLimpios.contrasena.valorCompleto || 
                                  datosLimpios.contrasena.valor || 
                                  datosLimpios.contrasena.password ||
                                  String(datosLimpios.contrasena)
      }
      
      // Validar que sea string
      if (datosLimpios.contrasena && typeof datosLimpios.contrasena !== 'string') {
        throw new Error('La contraseña debe ser un texto válido')
      }
      
      const response = await usuariosService.crearUsuario(datosLimpios)
      await obtenerUsuarios() // Refrescar lista
      await obtenerEstadisticas() // Refrescar estadísticas
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const editarUsuario = async (idUsuario, usuarioData) => {
    try {
      // Asegurarse de que la contraseña sea un string simple antes de enviar (si se proporciona)
      let datosLimpios = { ...usuarioData }
      
      if (datosLimpios.contrasena && typeof datosLimpios.contrasena === 'object') {
        datosLimpios.contrasena = datosLimpios.contrasena.valorCompleto || 
                                  datosLimpios.contrasena.valor || 
                                  datosLimpios.contrasena.password ||
                                  String(datosLimpios.contrasena)
      }
      
      // Validar que sea string si se proporciona
      if (datosLimpios.contrasena && typeof datosLimpios.contrasena !== 'string') {
        throw new Error('La contraseña debe ser un texto válido')
      }
      
      const response = await usuariosService.editarUsuario(idUsuario, datosLimpios)
      await obtenerUsuarios() // Refrescar lista
      await obtenerEstadisticas() // Refrescar estadísticas
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  const eliminarUsuario = async (idUsuario) => {
    try {
      const response = await usuariosService.eliminarUsuario(idUsuario)
      await obtenerUsuarios() // Refrescar lista
      await obtenerEstadisticas() // Refrescar estadísticas
      return response
    } catch (err) {
      throw err.response?.data || err
    }
  }

  return {
    usuarios,
    estadisticas,
    loading,
    error,
    obtenerUsuarios,
    obtenerEstadisticas,
    crearUsuario,
    editarUsuario,
    eliminarUsuario,
  }
}

