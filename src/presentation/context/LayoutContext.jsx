import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { claveBase } from '../utils/almacenLocal'

const LayoutContext = createContext()

const HEADER_STORAGE_KEY = claveBase('layout:headerVisible')
const SIDEBAR_STORAGE_KEY = claveBase('layout:sidebarMode')

/** Expandido (textos) → comprimido (solo iconos) → oculto. */
export const SIDEBAR_EXPANDED = 'expanded'
export const SIDEBAR_COLLAPSED = 'collapsed'
export const SIDEBAR_HIDDEN = 'hidden'

const estaEnPantallaCompleta = () =>
  typeof document !== 'undefined' &&
  !!(document.fullscreenElement || document.webkitFullscreenElement)

const leerModoSidebar = () => {
  if (typeof window === 'undefined') return SIDEBAR_EXPANDED
  const guardado = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
  if ([SIDEBAR_EXPANDED, SIDEBAR_COLLAPSED, SIDEBAR_HIDDEN].includes(guardado)) return guardado
  return SIDEBAR_EXPANDED
}

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within LayoutProvider')
  }
  return context
}

export const LayoutProvider = ({ children }) => {
  const [sidebarMode, setSidebarModeState] = useState(leerModoSidebar)
  // Último modo visible: al ocultar se conserva el ancho (si estaba comprimido
  // no debe saltar a w-64 a mitad de la animación de salida).
  const [lastVisibleMode, setLastVisibleMode] = useState(() => {
    const inicial = leerModoSidebar()
    return inicial === SIDEBAR_HIDDEN ? SIDEBAR_EXPANDED : inicial
  })
  const [headerVisible, setHeaderVisible] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.localStorage.getItem(HEADER_STORAGE_KEY) !== 'false'
  })
  const [isFullscreen, setIsFullscreen] = useState(estaEnPantallaCompleta)
  // Acción opcional junto al título (ej. «Editar métricas» en el Dashboard)
  const [headerAction, setHeaderAction] = useState(null)

  useEffect(() => {
    if (sidebarMode !== SIDEBAR_HIDDEN) setLastVisibleMode(sidebarMode)
  }, [sidebarMode])

  const setSidebarMode = useCallback((modo) => {
    setSidebarModeState(modo)
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, modo)
    } catch {
      /* ignore */
    }
  }, [])

  // En escritorio: expandido → iconos → oculto. En móvil: abre/cierra (sin rail de iconos).
  const toggleSidebar = useCallback(() => {
    const esMovil = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches
    setSidebarModeState((prev) => {
      let siguiente
      if (esMovil) {
        siguiente = prev === SIDEBAR_HIDDEN ? SIDEBAR_EXPANDED : SIDEBAR_HIDDEN
      } else if (prev === SIDEBAR_EXPANDED) {
        siguiente = SIDEBAR_COLLAPSED
      } else if (prev === SIDEBAR_COLLAPSED) {
        siguiente = SIDEBAR_HIDDEN
      } else {
        siguiente = SIDEBAR_EXPANDED
      }
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, siguiente)
      } catch {
        /* ignore */
      }
      return siguiente
    })
  }, [])

  const openSidebar = useCallback(() => {
    setSidebarMode(SIDEBAR_EXPANDED)
  }, [setSidebarMode])

  const toggleHeader = useCallback(() => {
    setHeaderVisible((prev) => {
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

  const sidebarOpen = sidebarMode !== SIDEBAR_HIDDEN
  // Incluye el frame de salida cuando se oculta desde el rail de iconos.
  const sidebarCollapsed =
    sidebarMode === SIDEBAR_COLLAPSED ||
    (sidebarMode === SIDEBAR_HIDDEN && lastVisibleMode === SIDEBAR_COLLAPSED)

  const value = useMemo(() => ({
    sidebarMode,
    sidebarOpen,
    sidebarCollapsed,
    setSidebarMode,
    toggleSidebar,
    openSidebar,
    headerVisible,
    toggleHeader,
    isFullscreen,
    toggleFullscreen,
    fullscreenSupported,
    headerAction,
    setHeaderAction,
  }), [
    sidebarMode,
    sidebarOpen,
    sidebarCollapsed,
    setSidebarMode,
    toggleSidebar,
    openSidebar,
    headerVisible,
    toggleHeader,
    isFullscreen,
    toggleFullscreen,
    fullscreenSupported,
    headerAction,
  ])

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  )
}
