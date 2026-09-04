import { useState, useCallback, useEffect, useRef } from 'react'

const STORAGE_KEY = 'zona2_pt210_device'
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb'
const PRINTER_CHARACTERISTIC_UUID = '00002af1-0000-1000-8000-00805f9b34fb'
const ALT_SERVICE_UUID = 'e7810a71-73ae-499d-8c15-faa9aef0c3f2'
const ALT_CHARACTERISTIC_UUID = 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f'

const loadSavedDevice = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const saveDevice = (device) => {
  if (!device?.id) return
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ id: device.id, name: device.name || 'PT-210' })
  )
}

const clearSavedDevice = () => localStorage.removeItem(STORAGE_KEY)

async function setupWriteCharacteristic(gattServer) {
  let service
  try {
    service = await gattServer.getPrimaryService(PRINTER_SERVICE_UUID)
  } catch {
    try {
      service = await gattServer.getPrimaryService(ALT_SERVICE_UUID)
    } catch {
      const services = await gattServer.getPrimaryServices()
      if (services.length === 0) throw new Error('No se encontró servicio de impresora')
      service = services[0]
    }
  }

  let writeCharacteristic
  try {
    const characteristics = await service.getCharacteristics()
    writeCharacteristic = characteristics.find(
      (c) => c.properties.write || c.properties.writeWithoutResponse
    )
  } catch {
    try {
      writeCharacteristic = await service.getCharacteristic(PRINTER_CHARACTERISTIC_UUID)
    } catch {
      writeCharacteristic = await service.getCharacteristic(ALT_CHARACTERISTIC_UUID)
    }
  }

  if (!writeCharacteristic) throw new Error('No se encontró característica de escritura')
  return writeCharacteristic
}

/**
 * Bluetooth PT-210 con persistencia y reconexión automática.
 */
export const useBluetooth = () => {
  const [device, setDevice] = useState(null)
  const [characteristic, setCharacteristic] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState(null)
  const [savedInfo, setSavedInfo] = useState(() => loadSavedDevice())

  const deviceRef = useRef(null)
  const characteristicRef = useRef(null)
  const wantConnectedRef = useRef(!!loadSavedDevice())
  const reconnectTimerRef = useRef(null)
  const reconnectAttemptRef = useRef(0)
  const connectingRef = useRef(false)
  const tryReconnectRef = useRef(async () => false)

  const clearReconnectTimer = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
  }

  const scheduleReconnect = useCallback(() => {
    if (!wantConnectedRef.current) return
    clearReconnectTimer()
    const attempt = reconnectAttemptRef.current
    const delay = Math.min(30000, 1000 * 2 ** Math.min(attempt, 5))
    reconnectTimerRef.current = setTimeout(() => {
      reconnectAttemptRef.current += 1
      tryReconnectRef.current()
    }, delay)
  }, [])

  const finishConnected = useCallback((bluetoothDevice, writeCharacteristic) => {
    deviceRef.current = bluetoothDevice
    characteristicRef.current = writeCharacteristic
    setDevice(bluetoothDevice)
    setCharacteristic(writeCharacteristic)
    setIsConnected(true)
    setIsConnecting(false)
    connectingRef.current = false
    setError(null)
    reconnectAttemptRef.current = 0
    clearReconnectTimer()
    saveDevice(bluetoothDevice)
    setSavedInfo({ id: bluetoothDevice.id, name: bluetoothDevice.name || 'PT-210' })
    wantConnectedRef.current = true
  }, [])

  const attachDisconnectHandler = useCallback(
    (bluetoothDevice) => {
      const onDisconnect = () => {
        setIsConnected(false)
        setCharacteristic(null)
        characteristicRef.current = null
        if (wantConnectedRef.current) scheduleReconnect()
      }
      if (bluetoothDevice._zona2OnDisc) {
        bluetoothDevice.removeEventListener('gattserverdisconnected', bluetoothDevice._zona2OnDisc)
      }
      bluetoothDevice._zona2OnDisc = onDisconnect
      bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnect)
    },
    [scheduleReconnect]
  )

  const connectToDevice = useCallback(
    async (bluetoothDevice) => {
      if (!bluetoothDevice?.gatt) throw new Error('Dispositivo inválido')
      attachDisconnectHandler(bluetoothDevice)
      const gattServer = bluetoothDevice.gatt.connected
        ? bluetoothDevice.gatt
        : await bluetoothDevice.gatt.connect()
      const writeCharacteristic = await setupWriteCharacteristic(gattServer)
      finishConnected(bluetoothDevice, writeCharacteristic)
      return true
    },
    [attachDisconnectHandler, finishConnected]
  )

  const findSavedDevice = useCallback(async () => {
    const saved = loadSavedDevice()
    if (!saved?.id || !navigator.bluetooth?.getDevices) return null
    const devices = await navigator.bluetooth.getDevices()
    return devices.find((d) => d.id === saved.id) || null
  }, [])

  const tryReconnect = useCallback(async () => {
    if (!wantConnectedRef.current || connectingRef.current) return false
    if (!navigator.bluetooth) return false

    if (deviceRef.current?.gatt?.connected && characteristicRef.current) {
      setIsConnected(true)
      return true
    }

    connectingRef.current = true
    setIsConnecting(true)
    setError(null)

    try {
      const bluetoothDevice = await findSavedDevice()
      if (!bluetoothDevice) {
        setIsConnecting(false)
        connectingRef.current = false
        if (wantConnectedRef.current) scheduleReconnect()
        return false
      }
      await connectToDevice(bluetoothDevice)
      return true
    } catch (err) {
      console.warn('[Bluetooth] Reconexión fallida:', err)
      setIsConnecting(false)
      connectingRef.current = false
      setIsConnected(false)
      if (wantConnectedRef.current) scheduleReconnect()
      return false
    }
  }, [connectToDevice, findSavedDevice, scheduleReconnect])

  tryReconnectRef.current = tryReconnect

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Tu navegador no soporta Web Bluetooth. Usa Chrome o Edge.')
      return false
    }

    const reconnected = await tryReconnect()
    if (reconnected) return true

    connectingRef.current = true
    setIsConnecting(true)
    setError(null)
    wantConnectedRef.current = true

    try {
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [PRINTER_SERVICE_UUID, ALT_SERVICE_UUID],
      })
      await connectToDevice(bluetoothDevice)
      return true
    } catch (err) {
      console.error('[Bluetooth]', err)
      setError('No se pudo conectar con la impresora. Intenta de nuevo.')
      setIsConnecting(false)
      connectingRef.current = false
      return false
    }
  }, [connectToDevice, tryReconnect])

  const disconnect = useCallback(async () => {
    wantConnectedRef.current = false
    clearReconnectTimer()
    clearSavedDevice()
    setSavedInfo(null)
    try {
      if (deviceRef.current?.gatt?.connected) {
        await deviceRef.current.gatt.disconnect()
      }
    } catch {
      // ignore
    }
    deviceRef.current = null
    characteristicRef.current = null
    setDevice(null)
    setCharacteristic(null)
    setIsConnected(false)
    setIsConnecting(false)
    connectingRef.current = false
  }, [])

  const write = useCallback(async (data) => {
    if (!characteristicRef.current || !deviceRef.current?.gatt?.connected) {
      const ok = await tryReconnectRef.current()
      if (!ok || !characteristicRef.current) {
        throw new Error('No hay conexión con la impresora')
      }
    }

    const ch = characteristicRef.current
    let buffer
    if (typeof data === 'string') buffer = new TextEncoder().encode(data)
    else if (data instanceof Uint8Array) buffer = data
    else buffer = new Uint8Array(data)

    const chunkSize = 20
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize)
      if (ch.properties.writeWithoutResponse) {
        await ch.writeValueWithoutResponse(chunk)
      } else {
        await ch.writeValue(chunk)
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }, [])

  useEffect(() => {
    if (wantConnectedRef.current) tryReconnect()

    const onVisible = () => {
      if (document.visibilityState === 'visible' && wantConnectedRef.current) {
        tryReconnect()
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    window.addEventListener('online', onVisible)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
      window.removeEventListener('online', onVisible)
      clearReconnectTimer()
    }
  }, [tryReconnect])

  return {
    device,
    isConnected,
    isConnecting,
    error,
    savedInfo,
    hasSavedDevice: !!savedInfo,
    connect,
    reconnect: tryReconnect,
    disconnect,
    write,
  }
}

export default useBluetooth
