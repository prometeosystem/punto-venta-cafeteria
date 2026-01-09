import { useEffect, useState, useCallback, useRef } from 'react'
import { X, Package, Bell, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const ToastNotification = ({ notification, onClose, onNavigate, duration = 5000, isActive = false }) => {
  const [progress, setProgress] = useState(100)
  const [isClosing, setIsClosing] = useState(false)
  const navigate = useNavigate()
  const startTimeRef = useRef(null)
  const intervalRef = useRef(null)
  const hasStartedRef = useRef(false) // Rastrear si el temporizador ya se inició

  const handleClose = useCallback(() => {
    setIsClosing(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimeout(() => {
      onClose()
    }, 300) // Esperar a que termine la animación de salida
  }, [onClose])

  const handleClick = useCallback(() => {
    // Eliminar de notificaciones y navegar si hay acción
    if (notification.accion && notification.accion.tipo === 'navegar') {
      if (notification.accion.params?.search) {
        navigate(`${notification.accion.ruta}?search=${encodeURIComponent(notification.accion.params.search)}`)
      } else {
        navigate(notification.accion.ruta, { state: notification.accion.params })
      }
    }
    // Llamar onNavigate si está disponible para eliminar de notificaciones
    if (onNavigate) {
      onNavigate(notification.id)
    }
    handleClose()
  }, [notification, navigate, onNavigate, handleClose])

  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Solo iniciar el temporizador si esta notificación está activa
    if (!isActive) {
      setProgress(100) // Mantener el progreso al 100% si no está activa
      return
    }

    // Solo establecer el startTime la primera vez que se activa
    // Usar hasStartedRef para asegurar que solo se establece UNA VEZ
    if (!hasStartedRef.current) {
      startTimeRef.current = Date.now()
      hasStartedRef.current = true
    }

    // Iniciar la animación de la barra de progreso solo cuando está activa
    intervalRef.current = setInterval(() => {
      // Verificar que startTimeRef existe (debería siempre existir aquí)
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now()
        hasStartedRef.current = true
      }
      
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, duration - elapsed)
      const progressPercent = (remaining / duration) * 100
      
      setProgress(progressPercent)
      
      if (remaining <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        startTimeRef.current = null
        hasStartedRef.current = false
        handleClose()
      }
    }, 16) // Actualizar cada ~16ms para animación suave (~60fps)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [duration, handleClose, isActive])
  
  // Resetear refs cuando la notificación se cierra completamente
  useEffect(() => {
    if (isClosing) {
      hasStartedRef.current = false
      startTimeRef.current = null
    }
  }, [isClosing])

  const getIcon = () => {
    if (notification.icono === 'package') {
      return <Package className={`w-5 h-5 ${notification.tipo === 'comanda' ? 'text-matcha-600' : 'text-gray-600'}`} />
    } else if (notification.icono === 'alert-triangle') {
      return <AlertTriangle className={`w-5 h-5 ${notification.tipo === 'inventario' ? (notification.estado === 'critical' ? 'text-red-600' : 'text-yellow-600') : 'text-gray-600'}`} />
    }
    // Icono para pre-órdenes debe ser azul
    if (notification.tipo === 'preorden') {
      return <Bell className="w-5 h-5 text-blue-600" />
    }
    return <Bell className={`w-5 h-5 ${notification.tipo === 'comanda' ? 'text-matcha-600' : 'text-gray-600'}`} />
  }

  const getBackgroundColor = () => {
    if (notification.tipo === 'comanda') {
      return 'bg-white border-matcha-200'
    } else if (notification.tipo === 'inventario') {
      return notification.estado === 'critical' ? 'bg-white border-red-200' : 'bg-white border-yellow-200'
    } else if (notification.tipo === 'preorden') {
      return 'bg-white border-blue-200'
    }
    return 'bg-white border-gray-200'
  }

  return (
    <div
      onClick={handleClick}
      className={`
        min-w-[320px] max-w-md w-full
        bg-white rounded-lg shadow-xl border-2
        ${getBackgroundColor()}
        transition-all duration-300 ease-in-out
        ${isClosing ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'}
        cursor-pointer hover:shadow-2xl
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icono */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            notification.tipo === 'comanda' ? 'bg-matcha-100' : 
            notification.tipo === 'inventario' ? (notification.estado === 'critical' ? 'bg-red-100' : 'bg-yellow-100') :
            notification.tipo === 'preorden' ? 'bg-blue-100' :
            'bg-gray-100'
          }`}>
            {getIcon()}
          </div>
          
          {/* Contenido */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {notification.titulo}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                  {notification.mensaje}
                </p>
              </div>
              
              {/* Botón cerrar */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleClose()
                }}
                className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                aria-label="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Barra de progreso verde */}
      <div className="h-1 bg-gray-100 rounded-b-lg overflow-hidden">
        <div
          className="h-full bg-green-500 transition-all duration-75 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

export default ToastNotification

