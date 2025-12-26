export type ServiceKind =
  | 'lecture_printing'
  | 'flex_printing'
  | 'banner_rollup'
  | 'vinyl'
  | 'brochure'
  | 'business_cards'
  | 'clothing'
  | 'generic_printing'
  | 'unknown'

const normalize = (value?: string) => (value || '').toLowerCase().trim()

export function getServiceKind(serviceName?: string): ServiceKind {
  const name = normalize(serviceName)
  if (!name) return 'unknown'

  // Arabic + English keywords
  if (name.includes('محاض') || name.includes('lecture')) return 'lecture_printing'
  if (name.includes('فليكس') || name.includes('flex')) return 'flex_printing'
  if (name.includes('بانر') || name.includes('بانرات') || name.includes('banner') || name.includes('roll up') || name.includes('roll-up') || name.includes('rollup')) {
    return 'banner_rollup'
  }
  if (name.includes('فينيل') || name.includes('vinyl')) return 'vinyl'
  if (name.includes('بروشور') || name.includes('brochure') || name.includes('فلير') || name.includes('flyer')) return 'brochure'
  if (name.includes('كروت') || name.includes('كرت') || name.includes('business card') || name.includes('business cards')) return 'business_cards'
  if (name.includes('ملابس') || name.includes('clothing') || name.includes('هودي') || name.includes('تيشيرت') || name.includes('t-shirt') || name.includes('hoodie')) {
    return 'clothing'
  }
  if (name.includes('طباعة') || name.includes('print')) return 'generic_printing'

  return 'unknown'
}


