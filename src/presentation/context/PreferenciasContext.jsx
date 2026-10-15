import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { configuracionService } from '../../application/services/configuracionService'
import { useAuth } from './AuthContext'
import {
  PREFERENCIAS_DEFAULT,
  esModoTienda,
  fusionarPreferencias,
} from '../utils/preferenciasUi'
import { sincronizarMetodosPagoDesdeServidor } from '../utils/metodosPagoConfig'

const PreferenciasContext = createContext(null)

export const PreferenciasProvider = ({ children }) => {
  const { usuario } = useAuth()
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_DEFAULT)
  const [cargando, setCargando] = useState(false)

  const aplicar = useCallback((datos) => {
    const next = fusionarPreferencias(datos)
    setPreferencias(next)
    sincronizarMetodosPagoDesdeServidor(next.metodos_pago)
    return next
  }, [])

  const recargar = useCallback(async () => {
    if (!usuario) {
      setPreferencias(PREFERENCIAS_DEFAULT)
      return PREFERENCIAS_DEFAULT
    }
    setCargando(true)
    try {
      const datos = await configuracionService.obtenerPreferenciasUi()
      return aplicar(datos)
    } catch {
      return aplicar(PREFERENCIAS_DEFAULT)
    } finally {
      setCargando(false)
    }
  }, [usuario, aplicar])

  useEffect(() => {
    recargar()
  }, [recargar])

  const guardar = useCallback(async (parcial) => {
    const datos = await configuracionService.guardarPreferenciasUi(parcial)
    const next = aplicar(datos)
    window.dispatchEvent(new CustomEvent('preferencias-ui-changed', { detail: next }))
    return next
  }, [aplicar])

  const value = useMemo(() => ({
    preferencias,
    cargando,
    modoTienda: esModoTienda(preferencias),
    modoRestaurante: !esModoTienda(preferencias),
    recargar,
    guardar,
  }), [preferencias, cargando, recargar, guardar])

  return (
    <PreferenciasContext.Provider value={value}>
      {children}
    </PreferenciasContext.Provider>
  )
}

export const usePreferencias = () => {
  const ctx = useContext(PreferenciasContext)
  if (!ctx) {
    throw new Error('usePreferencias debe usarse dentro de PreferenciasProvider')
  }
  return ctx
}
