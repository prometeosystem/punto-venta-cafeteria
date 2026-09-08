import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const LayoutContext = createContext()

const HEADER_STORAGE_KEY = 'layout:headerVisible'

const estaEnPantallaCompleta = () =>
  typeof document !== 'undefined' &&
  !!(document.fullscreenElement || document.webkitFullscreenElement)

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

export const LayoutProvider = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [headerVisible, setHeaderVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(HEADER_STORAGE_KEY) !== 'false'
  })
  const [isFullscreen, setIsFullscreen] = useState(estaEnPantallaCompleta)

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  const toggleHeader = useCallback(() => {
    setHeaderVisible(prev => {
      const siguiente = !prev
      window.localStorage.setItem(HEADER_STORAGE_KEY, String(siguiente))
      return siguiente
    })
  }, [])

  // El usuario puede salir de pantalla completa con Esc o con el gesto del sistema
  useEffect(() => {
    const sincronizar = () => setIsFullscreen(estaEnPantallaCompleta())
    document.addEventListener('fullscreenchange', sincronizar)
    document.addEventListener('webkitfullscreenchange', sincronizar)
    return () => {
      document.removeEventListener('fullscreenchange', sincronizar)
      document.removeEventListener('webkitfullscreenchange', sincronizar)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const raiz = document.documentElement
    try {
      if (estaEnPantallaCompleta()) {
        await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())
      } else {
        await (raiz.requestFullscreen?.() ?? raiz.webkitRequestFullscreen?.())
      }
    } catch {
      // Safari en iPad no permite pantalla completa sobre el documento
    }
  }, [])

  const fullscreenSupported =
    typeof document !== 'undefined' &&
    !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)

  return (
    <LayoutContext.Provider
      value={{
        sidebarOpen,
        toggleSidebar,
        headerVisible,
        toggleHeader,
        isFullscreen,
        toggleFullscreen,
        fullscreenSupported,
      }}
    >
      {children}
    </LayoutContext.Provider>
  )
}
