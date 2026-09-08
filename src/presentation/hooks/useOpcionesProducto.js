import { useCallback, useEffect, useState } from 'react'
import { opcionesProductoService } from '../../application/services/opcionesProductoService'
import {
  hidratarAsignacionesGrupo,
  hidratarGruposOpcion,
} from '../utils/productOptionsConfig'

/** Evento con el que la pantalla de ajustes avisa que cambió el catálogo. */
export const EVENTO_OPCIONES_ACTUALIZADAS = 'opciones-producto-actualizadas'

export function notificarOpcionesActualizadas() {
  window.dispatchEvent(new CustomEvent(EVENTO_OPCIONES_ACTUALIZADAS))
}

/**
 * Carga los grupos de opciones y a qué productos se asignan, y los deja
 * disponibles para las funciones de precio, que son síncronas. Si falla se
 * conservan los valores de respaldo.
 */
export function useOpcionesProducto() {
  const [cargado, setCargado] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const [grupos, asignaciones] = await Promise.all([
        opcionesProductoService.listarGrupos(false),
        opcionesProductoService.gruposPorProducto(),
      ])
      hidratarGruposOpcion(grupos)
      hidratarAsignacionesGrupo(asignaciones)
    } catch (error) {
      console.error('No se pudo cargar el catálogo de opciones de producto:', error)
    } finally {
      setCargado(true)
    }
  }, [])

  useEffect(() => {
    cargar()
    window.addEventListener(EVENTO_OPCIONES_ACTUALIZADAS, cargar)
    return () => window.removeEventListener(EVENTO_OPCIONES_ACTUALIZADAS, cargar)
  }, [cargar])

  return { cargado, recargar: cargar }
}

export default useOpcionesProducto
