const stripToDigits = (value: string) => (value || '').replace(/[^0-9]/g, '')

export function buildWhatsAppWebUrl(phone: string, message?: string) {
  const cleanPhone = stripToDigits(phone)
  const params = new URLSearchParams()
  if (cleanPhone) params.set('phone', cleanPhone)
  if (message) params.set('text', message)
  // app_absent=0 helps some environments prefer web without trying app deep-links
  params.set('app_absent', '0')
  return `https://web.whatsapp.com/send?${params.toString()}`
}

export function buildWhatsAppWaMeUrl(phone: string, message?: string) {
  const cleanPhone = stripToDigits(phone)
  const base = `https://wa.me/${cleanPhone}`
  if (!message) return base
  return `${base}?text=${encodeURIComponent(message)}`
}


