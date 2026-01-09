import { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../../application/services/authService'

const AuthContext = createContext(null)

// Función para decodificar el token JWT y obtener la fecha de expiración
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(jsonPayload)
  } catch (error) {
    console.error('Error al decodificar token:', error)
    return null
  }
}

// Función para verificar si el token ha expirado
const isTokenExpired = (token) => {
  if (!token) return true
  
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true
  
  // exp está en segundos, Date.now() está en milisegundos
  const expirationTime = decoded.exp * 1000
  const currentTime = Date.now()
  
  return currentTime >= expirationTime
}

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    
    // Verificar si el token ha expirado
    if (token && isTokenExpired(token)) {
      console.log('Token expirado, cerrando sesión...')
      authService.logout()
      setUsuario(null)
      setLoading(false)
      return
    }
    
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

    // Verificar expiración del token periódicamente (cada minuto)
    const checkTokenExpiration = setInterval(() => {
      const currentToken = localStorage.getItem('token')
      if (currentToken && isTokenExpired(currentToken)) {
        console.log('Token expirado detectado, cerrando sesión...')
        authService.logout()
        setUsuario(null)
        // Redirigir al login si estamos en una página protegida
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }, 60000) // Verificar cada minuto

    return () => {
      clearInterval(checkTokenExpiration)
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

