import { ToastType } from '../components/Toast'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toasts: Toast[] = []
let listeners: ((toasts: Toast[]) => void)[] = []

export function subscribe(listener: (toasts: Toast[]) => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function notify() {
  listeners.forEach((listener) => listener([...toasts]))
}

function addToast(message: string, type: ToastType) {
  const id = Math.random().toString(36).substring(2, 9)
  toasts.push({ id, message, type })
  notify()
}

export function showToast(message: string, type: ToastType = 'info') {
  addToast(message, type)
}

export function showSuccess(message: string) {
  showToast(message, 'success')
}

export function showError(message: string) {
  showToast(message, 'error')
}

export function showWarning(message: string) {
  showToast(message, 'warning')
}

export function showInfo(message: string) {
  showToast(message, 'info')
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function getToasts() {
  return [...toasts]
}

