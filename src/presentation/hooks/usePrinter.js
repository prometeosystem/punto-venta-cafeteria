import { useCallback } from 'react'
import { useBluetooth } from './useBluetooth'
import { generateCafeTicketBytesAsync, generateTestPrintBytes } from '../utils/escposService'

/**
 * Impresión térmica ESC/POS vía Bluetooth.
 */
export const usePrinter = () => {
  const bluetooth = useBluetooth()

  const printTicket = useCallback(
    async (ticketData) => {
      if (!bluetooth.isConnected) {
        const ok = await bluetooth.reconnect()
        if (!ok) throw new Error('Impresora no conectada')
      }
      const bytes = await generateCafeTicketBytesAsync(ticketData)
      await bluetooth.write(bytes)
      return true
    },
    [bluetooth]
  )

  const printTest = useCallback(async () => {
    if (!bluetooth.isConnected) {
      const ok = await bluetooth.reconnect()
      if (!ok) throw new Error('Impresora no conectada')
    }
    await bluetooth.write(generateTestPrintBytes())
    return true
  }, [bluetooth])

  return {
    ...bluetooth,
    printTicket,
    printTest,
  }
}

export default usePrinter
