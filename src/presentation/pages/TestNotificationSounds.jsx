import { useState } from 'react'
import { Play, Volume2 } from 'lucide-react'

const TestNotificationSounds = () => {
  const [playing, setPlaying] = useState(null)

  // Sonido de notificación normal (campanita agradable)
  const playNotificationSound = () => {
    try {
      setPlaying('notification')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.8
      
      const frequencies = [523.25, 659.25, 783.99, 1046.50]
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = freq
        oscillator.type = 'sine'
        
        const startTime = audioContext.currentTime + (index * 0.05)
        const endTime = startTime + duration

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.5 / frequencies.length, startTime + 0.05)
        gainNode.gain.linearRampToValueAtTime(0.3 / frequencies.length, startTime + 0.2)
        gainNode.gain.exponentialRampToValueAtTime(0.001, endTime - 0.4)
        gainNode.gain.linearRampToValueAtTime(0, endTime)

        oscillator.start(startTime)
        oscillator.stop(endTime)
      })

      setTimeout(() => setPlaying(null), duration * 1000 + 500)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  // Sonido actual de error/alerta (batería baja de iPhone)
  const playErrorSound = () => {
    try {
      setPlaying('error')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.4
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(600, now)
      oscillator.frequency.exponentialRampToValueAtTime(400, now + duration)
      
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.35, now + 0.05)
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.15)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + duration)

      setTimeout(() => setPlaying(null), duration * 1000 + 500)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  // Opción 1: Sonido de batería baja de iPhone (más auténtico - tres tonos descendentes)
  const playIPhoneLowBattery = () => {
    try {
      setPlaying('iphone')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const baseDuration = 0.25
      
      // Tres tonos descendentes rápidos (como iPhone)
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

      setTimeout(() => setPlaying(null), 800)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  // Opción 2: Sonido de alerta más suave (tipo iOS)
  const playSoftAlert = () => {
    try {
      setPlaying('soft')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.35
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(523.25, now) // Nota C5
      oscillator.frequency.exponentialRampToValueAtTime(392.00, now + duration) // Descender a G4
      
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.03)
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + duration)

      setTimeout(() => setPlaying(null), duration * 1000 + 300)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  // Opción 3: Sonido de alerta tipo "ding-dong" suave
  const playDingDong = () => {
    try {
      setPlaying('dingdong')
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

      setTimeout(() => setPlaying(null), 700)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  // Opción 4: Sonido más agudo tipo "peep"
  const playPeep = () => {
    try {
      setPlaying('peep')
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const now = audioContext.currentTime
      const duration = 0.3
      
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, now)
      oscillator.frequency.exponentialRampToValueAtTime(400, now + duration)
      
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + duration)

      setTimeout(() => setPlaying(null), duration * 1000 + 300)
    } catch (error) {
      console.error('Error al reproducir sonido:', error)
      setPlaying(null)
    }
  }

  const soundOptions = [
    {
      id: 'notification',
      name: 'Notificación Normal (Campanita)',
      description: 'Sonido agradable para notificaciones de comandas',
      play: playNotificationSound,
      color: 'matcha'
    },
    {
      id: 'error',
      name: 'Error Actual (Batería Baja iPhone)',
      description: 'Sonido actual para stock bajo/crítico',
      play: playErrorSound,
      color: 'yellow'
    },
    {
      id: 'iphone',
      name: 'Batería Baja iPhone (Auténtico)',
      description: 'Tres tonos descendentes, como el iPhone real',
      play: playIPhoneLowBattery,
      color: 'red'
    },
    {
      id: 'soft',
      name: 'Alerta Suave (iOS)',
      description: 'Sonido suave tipo iOS para alertas',
      play: playSoftAlert,
      color: 'blue'
    },
    {
      id: 'dingdong',
      name: 'Ding-Dong Suave',
      description: 'Dos tonos descendentes tipo "ding-dong"',
      play: playDingDong,
      color: 'purple'
    },
    {
      id: 'peep',
      name: 'Peep Agudo',
      description: 'Sonido agudo y corto tipo "peep"',
      play: playPeep,
      color: 'orange'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-matcha-50 to-coffee-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-3">
              <Volume2 className="w-8 h-8 text-matcha-600" />
              Prueba de Sonidos de Notificaciones
            </h1>
            <p className="text-gray-600">
              Escucha los diferentes sonidos y elige el que prefieras para las notificaciones de stock
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {soundOptions.map((sound) => (
              <div
                key={sound.id}
                className={`card border-2 ${
                  sound.id === 'error' 
                    ? 'border-yellow-400 bg-yellow-50' 
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {sound.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {sound.description}
                    </p>
                  </div>
                  {sound.id === 'error' && (
                    <span className="ml-2 px-2 py-1 bg-yellow-200 text-yellow-800 text-xs font-medium rounded">
                      Actual
                    </span>
                  )}
                </div>
                <button
                  onClick={sound.play}
                  disabled={playing === sound.id}
                  className={`btn-primary w-full flex items-center justify-center gap-2 ${
                    playing === sound.id ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {playing === sound.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Reproduciendo...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Reproducir Sonido
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> Estos sonidos son generados programáticamente usando Web Audio API. 
              Una vez que elijas tu favorito, podemos actualizarlo en el código de notificaciones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestNotificationSounds

