import { createContext, useContext } from 'react'
import { usePrinter } from '../hooks/usePrinter'

const PrinterContext = createContext(null)

/**
 * Mantiene la conexión de la PT-210 viva en toda la app (no solo en Punto de Venta).
 */
export const PrinterProvider = ({ children }) => {
  const printer = usePrinter()
  return <PrinterContext.Provider value={printer}>{children}</PrinterContext.Provider>
}

export const usePrinterContext = () => {
  const ctx = useContext(PrinterContext)
  if (!ctx) {
    throw new Error('usePrinterContext debe usarse dentro de PrinterProvider')
  }
  return ctx
}

export default PrinterContext
