import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { inventarioService } from '../../application/services/inventarioService'
import { preordenesService } from '../../application/services/preordenesService'
import { useAuth } from './AuthContext'

const NotificationContext = createContext()

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications debe ser usado dentro de NotificationProvider')
  }
  return context
}

export const NotificationProvider = ({ children }) => {
  const { usuario } = useAuth() // Obtener usuario autenticado
  const [notifications, setNotifications] = useState([])
  const [toastNotifications, setToastNotifications] = useState([]) // Notificaciones toast temporales
  const preordenIdsNotificadasRef = useRef(new Set()) // Almacenar IDs de pre-órdenes ya notificadas

  // Reproducir sonido de notificación (similar a campanita de hotel o iPhone)
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 1.8 // Duración total del sonido en segundos
      
      // Crear múltiples osciladores para un sonido más rico y agradable
      // Primer tono (más bajo, como base)
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      oscillator1.type = 'sine'
      oscillator1.frequency.value = 523.25 // Nota C5
      
      gainNode1.gain.setValueAtTime(0, now)
      gainNode1.gain.linearRampToValueAtTime(0.25, now + 0.05)
      gainNode1.gain.linearRampToValueAtTime(0.15, now + 0.2)
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      oscillator1.start(now)
      oscillator1.stop(now + duration)
      
      // Segundo tono (medio, armónico)
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()
      oscillator2.type = 'sine'
      oscillator2.frequency.value = 659.25 // Nota E5
      
      gainNode2.gain.setValueAtTime(0, now)
      gainNode2.gain.linearRampToValueAtTime(0.2, now + 0.08)
      gainNode2.gain.linearRampToValueAtTime(0.12, now + 0.25)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)
      oscillator2.start(now + 0.05) // Inicia ligeramente después para efecto cascada
      oscillator2.stop(now + duration)
      
      // Tercer tono (alto, como campanita)
      const oscillator3 = audioContext.createOscillator()
      const gainNode3 = audioContext.createGain()
      oscillator3.type = 'sine'
      oscillator3.frequency.value = 783.99 // Nota G5
      
      gainNode3.gain.setValueAtTime(0, now)
      gainNode3.gain.linearRampToValueAtTime(0.3, now + 0.1)
      gainNode3.gain.linearRampToValueAtTime(0.18, now + 0.3)
      gainNode3.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator3.connect(gainNode3)
      gainNode3.connect(audioContext.destination)
      oscillator3.start(now + 0.1) // Inicia después para efecto de campanita
      oscillator3.stop(now + duration)
      
      // Cuarto tono (muy alto, brillante como campanita de hotel)
      const oscillator4 = audioContext.createOscillator()
      const gainNode4 = audioContext.createGain()
      oscillator4.type = 'sine'
      oscillator4.frequency.value = 1046.50 // Nota C6
      
      gainNode4.gain.setValueAtTime(0, now)
      gainNode4.gain.linearRampToValueAtTime(0.25, now + 0.12)
      gainNode4.gain.linearRampToValueAtTime(0.15, now + 0.35)
      gainNode4.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator4.connect(gainNode4)
      gainNode4.connect(audioContext.destination)
      oscillator4.start(now + 0.15) // Último tono para el efecto "ding"
      oscillator4.stop(now + duration)
    } catch (error) {
      console.error('Error al reproducir sonido de notificación:', error)
      // Fallback a un sonido simple si hay error
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      } catch (fallbackError) {
        console.error('Error en fallback del sonido:', fallbackError)
      }
    }
  }, [])

  // Reproducir sonido de error/alerta (Batería Baja iPhone - Auténtico: tres tonos descendentes)
  const playErrorSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const baseDuration = 0.25
      
      // Tres tonos descendentes rápidos (como iPhone auténtico)
      const tones = [
        { freq: 600, start: 0 },
        { freq: 550, start: 0.15 },
        { freq: 500, start: 0.3 }
      ]
      
      tones.forEach((tone) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.type = 'sine'
        oscillator.frequency.value = tone.freq
        
        const startTime = now + tone.start
        const endTime = startTime + baseDuration
        
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, endTime)
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.start(startTime)
        oscillator.stop(endTime)
      })
      
    } catch (error) {
      console.error('Error al reproducir sonido de error:', error)
      // Fallback a un sonido simple
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 500
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.4)
      } catch (fallbackError) {
        console.error('Error en fallback del sonido de error:', fallbackError)
      }
    }
  }, [])

  // Reproducir sonido de pre-orden (Ding-Dong Suave)
  const playPreordenSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      
      // Primer "ding"
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      oscillator1.type = 'sine'
      oscillator1.frequency.value = 523.25 // C5
      
      gainNode1.gain.setValueAtTime(0, now)
      gainNode1.gain.linearRampToValueAtTime(0.35, now + 0.05)
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.25)
      
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      oscillator1.start(now)
      oscillator1.stop(now + 0.25)
      
      // Segundo "dong" (más bajo)
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()
      oscillator2.type = 'sine'
      oscillator2.frequency.value = 392.00 // G4
      
      gainNode2.gain.setValueAtTime(0, now + 0.2)
      gainNode2.gain.linearRampToValueAtTime(0.35, now + 0.25)
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.5)
      
      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)
      oscillator2.start(now + 0.2)
      oscillator2.stop(now + 0.5)
      
    } catch (error) {
      console.error('Error al reproducir sonido de pre-orden:', error)
      // Fallback a un sonido simple
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = 600
        oscillator.type = 'sine'
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
      } catch (fallbackError) {
        console.error('Error en fallback del sonido de pre-orden:', fallbackError)
      }
    }
  }, [])

  // Eliminar notificación toast
  const removeToastNotification = useCallback((notificationId) => {
    setToastNotifications(prev => prev.filter(notif => notif.id !== notificationId))
  }, [])

  // Agregar notificación
  const addNotification = useCallback((notification) => {
    const notificationId = Date.now() + Math.random() // ID único con timestamp y random
    const newNotification = {
      id: notificationId,
      ...notification,
      leida: false,
      fecha: new Date().toISOString()
    }
    
    // Agregar a la lista de notificaciones permanente
    setNotifications(prev => [newNotification, ...prev])
    
    // Agregar como toast (se eliminará automáticamente después de 5 segundos)
    setToastNotifications(prev => [...prev, newNotification])
    
    // Reproducir sonido según el tipo de notificación
    if (notification.tipo === 'inventario') {
      // Batería Baja iPhone (Auténtico) para alertas de stock
      playErrorSound()
    } else if (notification.tipo === 'preorden') {
      // Ding-Dong Suave para pre-órdenes de clientes
      playPreordenSound()
    } else {
      // Notificación Normal (Campanita) para comandas
      playNotificationSound()
    }
  }, [playNotificationSound, playErrorSound, playPreordenSound])

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, leida: true } : notif
      )
    )
  }, [])

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, leida: true }))
    )
  }, [])

  // Eliminar notificación
  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId))
  }, [])

  // Obtener notificaciones no leídas
  const unreadCount = notifications.filter(n => !n.leida).length

  // Función para verificar insumos con stock bajo/crítico
  const verificarInsumosStock = useCallback(async () => {
    // Solo verificar si hay un usuario autenticado
    if (!usuario) {
      return
    }
    
    try {
      const insumos = await inventarioService.obtenerInsumos()
      
      if (!Array.isArray(insumos)) return
      
      // Obtener notificaciones actuales usando el estado funcional
      setNotifications(prevNotifications => {
        const nuevasNotificaciones = [...prevNotifications]
        const nuevasToastNotificaciones = []
        let hayNuevas = false
      
        // Verificar cada insumo
        insumos.forEach((insumo) => {
          if (!insumo.activo) return // Solo insumos activos
          
          const cantidadActual = parseFloat(insumo.cantidad_actual || 0)
          const cantidadMinima = parseFloat(insumo.cantidad_minima || 0)
          
          // Determinar estado
          let estado = 'ok'
          if (cantidadActual <= 0) {
            estado = 'critical'
          } else if (cantidadActual < cantidadMinima) {
            estado = 'low'
          }
          
          // Solo crear notificación si está bajo o crítico
          if (estado === 'low' || estado === 'critical') {
            // Verificar si ya existe una notificación para este insumo (evitar duplicados)
            const existeNotificacion = prevNotifications.some(
              n => n.tipo === 'inventario' && 
                   n.insumoId === insumo.id_insumo && 
                   !n.leida
            )
            
            if (!existeNotificacion) {
              const titulo = estado === 'critical' 
                ? 'Stock Crítico' 
                : 'Stock Bajo'
              const mensaje = `${insumo.nombre}: ${cantidadActual.toFixed(2)} ${insumo.unidad_medida || ''} (Mínimo: ${cantidadMinima.toFixed(2)})`
              
              const nuevaNotificacion = {
                id: Date.now() + Math.random(), // ID único
                tipo: 'inventario',
                titulo,
                mensaje,
                accion: {
                  tipo: 'navegar',
                  ruta: '/inventario',
                  params: { search: insumo.nombre }
                },
                icono: 'alert-triangle',
                insumoId: insumo.id_insumo,
                estado: estado,
                leida: false,
                fecha: new Date().toISOString()
              }
              
              nuevasNotificaciones.unshift(nuevaNotificacion)
              nuevasToastNotificaciones.push(nuevaNotificacion)
              hayNuevas = true
            }
          }
        })
        
        // Agregar nuevas notificaciones toast
        if (nuevasToastNotificaciones.length > 0) {
          setToastNotifications(prev => [...prev, ...nuevasToastNotificaciones])
        }
        
        // Reproducir sonido de error solo si hay nuevas notificaciones de inventario
        if (hayNuevas) {
          setTimeout(() => playErrorSound(), 0)
        }
        
        return nuevasNotificaciones
      })
    } catch (error) {
      // Solo mostrar error si no es un error de autenticación (401)
      // Los errores 401 son esperados cuando el usuario no está autenticado
      if (error.response?.status !== 401) {
        console.error('Error al verificar insumos con stock bajo:', error)
      }
    }
  }, [playErrorSound, usuario])

  // Escuchar eventos de creación de comandas
  useEffect(() => {
    const handleComandaCreada = (event) => {
      const { id_comanda, id_venta, ticket_id, numero_pedido_dia } = event.detail || {}
      
      if (id_comanda) {
        const mensaje = numero_pedido_dia != null && numero_pedido_dia !== ''
          ? `Venta #${id_venta} · Pedido del día #${numero_pedido_dia}`
          : `Venta #${id_venta}`
        addNotification({
          tipo: 'comanda',
          titulo: 'Nueva Comanda',
          mensaje,
          accion: {
            tipo: 'navegar',
            ruta: '/barista',
            params: { id_comanda }
          },
          icono: 'package'
        })
      }
    }

    // Escuchar eventos personalizados
    window.addEventListener('comanda-creada', handleComandaCreada)

    return () => {
      window.removeEventListener('comanda-creada', handleComandaCreada)
    }
  }, [addNotification])

  // Escuchar cuando una comanda sin pagar se termina → notificar al Punto de Venta para cobrar
  useEffect(() => {
    const handleComandaListaParaCobrar = (event) => {
      const { id_comanda, id_venta, numero_dia, nombre_cliente } = event.detail || {}
      if (id_comanda != null || id_venta != null) {
        const mensaje = numero_dia != null && numero_dia !== ''
          ? `Pedido del día #${numero_dia}${nombre_cliente ? ` · ${nombre_cliente}` : ''} listo para cobrar`
          : nombre_cliente
            ? `${nombre_cliente} — listo para cobrar`
            : 'Comanda lista para cobrar en Punto de Venta'
        addNotification({
          tipo: 'comanda-lista-cobrar',
          titulo: 'Lista para cobrar',
          mensaje,
          accion: {
            tipo: 'navegar',
            ruta: '/punto-venta'
          },
          icono: 'dollar-sign'
        })
      }
    }
    window.addEventListener('comanda-lista-para-cobrar', handleComandaListaParaCobrar)
    return () => {
      window.removeEventListener('comanda-lista-para-cobrar', handleComandaListaParaCobrar)
    }
  }, [addNotification])

  // Escuchar eventos de comanda terminada para verificar stock inmediatamente
  useEffect(() => {
    const handleComandaTerminada = () => {
      // Esperar un pequeño delay para asegurar que el backend haya actualizado el inventario
      setTimeout(() => {
        verificarInsumosStock()
      }, 500) // 500ms de delay para dar tiempo al backend
    }

    // Escuchar eventos personalizados
    window.addEventListener('comanda-terminada', handleComandaTerminada)

    return () => {
      window.removeEventListener('comanda-terminada', handleComandaTerminada)
    }
  }, [verificarInsumosStock])

  // Verificar insumos periódicamente (cada 2 minutos)
  useEffect(() => {
    // Solo verificar si hay un usuario autenticado
    if (!usuario) {
      return
    }
    
    // Verificar inmediatamente al montar
    verificarInsumosStock()
    
    // Configurar intervalo para verificar cada 2 minutos
    const intervalo = setInterval(() => {
      verificarInsumosStock()
    }, 2 * 60 * 1000) // 2 minutos

    return () => {
      clearInterval(intervalo)
    }
  }, [verificarInsumosStock, usuario])

  // Detectar pre-órdenes nuevas desde la web (polling cada 10 segundos)
  useEffect(() => {
    const verificarPreordenesNuevas = async () => {
      // Solo verificar si hay un usuario autenticado
      if (!usuario) {
        return
      }
      
      try {
        // Obtener pre-órdenes con origen='web' y estado='preorden'
        const todasPreordenes = await preordenesService.obtenerPreordenes()
        
        if (!Array.isArray(todasPreordenes)) return
        
        // Filtrar solo pre-órdenes web con estado 'preorden'
        const preordenesWeb = todasPreordenes.filter(
          preorden => preorden.origen === 'web' && preorden.estado === 'preorden'
        )
        
        // Detectar nuevas pre-órdenes
        setNotifications(prevNotifications => {
          const nuevasNotificaciones = [...prevNotifications]
          const nuevasToastNotificaciones = []
          let hayNuevas = false
          
          preordenesWeb.forEach((preorden) => {
            // Verificar si ya existe una notificación para esta pre-orden (evitar duplicados)
            const existeNotificacion = prevNotifications.some(
              n => n.tipo === 'preorden' && 
                   n.preordenId === preorden.id_preorden && 
                   !n.leida
            )
            
            // Verificar si ya está en el conjunto de IDs notificadas (evitar notificaciones repetidas en la misma sesión)
            const yaNotificada = preordenIdsNotificadasRef.current.has(preorden.id_preorden)
            
            if (!existeNotificacion && !yaNotificada) {
              const itemsCount = preorden.detalles?.reduce((sum, d) => sum + d.cantidad, 0) || 0
              
              const nuevaNotificacion = {
                id: Date.now() + Math.random(), // ID único
                tipo: 'preorden',
                titulo: 'Nueva Pre-orden',
                mensaje: `Pre-orden #${preorden.id_preorden} de ${preorden.nombre_cliente || 'Cliente'} (${itemsCount} ${itemsCount === 1 ? 'item' : 'items'})`,
                accion: {
                  tipo: 'navegar',
                  ruta: '/punto-venta',
                  params: { preorden_id: preorden.id_preorden }
                },
                icono: 'bell',
                preordenId: preorden.id_preorden,
                leida: false,
                fecha: new Date().toISOString()
              }
              
              nuevasNotificaciones.unshift(nuevaNotificacion)
              nuevasToastNotificaciones.push(nuevaNotificacion)
              
              // Agregar a conjunto de IDs notificadas
              preordenIdsNotificadasRef.current.add(preorden.id_preorden)
              hayNuevas = true
            }
          })
          
          // Agregar nuevas notificaciones toast
          if (nuevasToastNotificaciones.length > 0) {
            setToastNotifications(prev => [...prev, ...nuevasToastNotificaciones])
          }
          
          // Reproducir sonido solo si hay nuevas pre-órdenes
          if (hayNuevas) {
            setTimeout(() => playPreordenSound(), 0)
          }
          
          return nuevasNotificaciones
        })
      } catch (error) {
        // Solo mostrar error si no es un error de autenticación (401)
        // Los errores 401 son esperados cuando el usuario no está autenticado
        if (error.response?.status !== 401) {
          console.error('Error al verificar pre-órdenes nuevas:', error)
        }
      }
    }
    
    // Solo verificar si hay un usuario autenticado
    if (usuario) {
      // Verificar inmediatamente al montar
      verificarPreordenesNuevas()
      
      // Configurar intervalo para verificar cada 10 segundos
      const intervaloPreordenes = setInterval(() => {
        verificarPreordenesNuevas()
      }, 10 * 1000) // 10 segundos

      return () => {
        clearInterval(intervaloPreordenes)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playPreordenSound, usuario])

  const value = {
    notifications,
    toastNotifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    removeToastNotification
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

