import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../../application/services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    // Si hay un usuario guardado en localStorage, usarlo temporalmente mientras se carga
    const storedUser = authService.getStoredUser()
    if (storedUser) {
      setUsuario(storedUser)
    }
    
    if (token) {
      // Intentar obtener el usuario actual del backend
      // Agregar timeout para evitar carga infinita
      const timeoutId = setTimeout(() => {
        setLoading(false)
      }, 5000) // Timeout de 5 segundos
      
      authService
        .getCurrentUser()
        .then((userData) => {
          clearTimeout(timeoutId)
          setUsuario(userData)
          // Actualizar localStorage con los datos más recientes
          if (userData) {
            localStorage.setItem('usuario', JSON.stringify(userData))
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          console.error('Error al obtener usuario:', error)
          // Token inválido o backend no disponible, limpiar
          authService.logout()
          setUsuario(null)
        })
        .finally(() => {
          clearTimeout(timeoutId)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (correo, contrasena) => {
    try {
      const response = await authService.login(correo, contrasena)
      setUsuario(response.usuario)
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    authService.logout()
    setUsuario(null)
  }

  const value = {
    usuario,
    loading,
    login,
    logout,
    isAuthenticated: !!usuario,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider')
  }
  return context
}

