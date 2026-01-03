import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../../application/services/authService'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Intentar obtener el usuario actual
      authService
        .getCurrentUser()
        .then((userData) => {
          setUsuario(userData)
        })
        .catch(() => {
          // Token inválido, limpiar
          authService.logout()
        })
        .finally(() => {
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

