import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2, Coffee, Eye, EyeOff } from 'lucide-react'

const Login = () => {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarContrasena, setMostrarContrasena] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(correo, contrasena)
      // Redirigir a dashboard después del login exitoso
      navigate('/dashboard')
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Error al iniciar sesión. Verifica tus credenciales.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-matcha-50 to-coffee-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo y título */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-matcha-100 p-4 rounded-full">
                <Coffee className="w-12 h-12 text-matcha-600" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bienvenido</h1>
              <p className="text-gray-600 mt-2">Inicia sesión en tu cuenta</p>
            </div>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-2">
                Usuario o Correo electrónico
              </label>
              <input
                id="correo"
                type="text"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
                className="input w-full"
                placeholder="usuario@ejemplo.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="contrasena" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="contrasena"
                  type={mostrarContrasena ? 'text' : 'password'}
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  required
                  className="input w-full pr-10"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                  disabled={loading}
                >
                  {mostrarContrasena ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-200">
            <p>Sistema de Punto de Venta - Cafetería</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login

