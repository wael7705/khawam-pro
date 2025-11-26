import { useCallback } from 'react'

type SoundType = 'new_order' | 'warning' | 'success'

export function useNotificationSound() {
  const playSound = useCallback((type: SoundType = 'new_order') => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      // إعدادات مختلفة حسب نوع الصوت
      switch (type) {
        case 'new_order':
          oscillator.frequency.value = 800
          oscillator.type = 'sine'
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.5)
          break

        case 'warning':
          oscillator.frequency.value = 600
          oscillator.type = 'square'
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.8)
          break

        case 'success':
          oscillator.frequency.value = 1000
          oscillator.type = 'sine'
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + 0.3)
          break
      }
    } catch (error) {
      console.warn('⚠️ فشل تشغيل صوت التنبيه:', error)
    }
  }, [])

  return { playSound }
}

