const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api').replace(/\/$/, '')
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

export type NormalizedAttachment = {
  url: string
  filename: string
  isImage: boolean
  location?: string
  sizeLabel?: string
  orderItemId?: number
  originLabel?: string
  data_url?: string
  file_exists?: boolean
}

export type OrderAttachment = {
  id?: string
  order_item_id?: number
  order_item_service_name?: string
  filename?: string
  url?: string
  download_url?: string
  raw_path?: string
  location?: string
  mime_type?: string
  size_label?: string
  size_in_bytes?: number
  data_url?: string
  file_exists?: boolean
}

const isDataUrl = (value: string) => /^data:/i.test(value)
const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith('blob:')
const looksLikeImage = (value: string) => /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(value)

const extractFileName = (value?: string) => {
  if (!value) return ''
  const withoutQuery = value.split('?')[0]
  const segments = withoutQuery.split('/')
  return segments[segments.length - 1] || ''
}

const prettyFileSize = (size?: number | string) => {
  if (size === undefined || size === null) return undefined
  const numericSize = typeof size === 'string' ? Number(size) : size
  if (Number.isNaN(numericSize) || numericSize <= 0) return undefined
  if (numericSize < 1024) return `${numericSize} B`
  if (numericSize < 1024 * 1024) return `${(numericSize / 1024).toFixed(1)} KB`
  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`
}

export const resolveToAbsoluteUrl = (value?: string) => {
  if (!value) return ''
  if (isDataUrl(value) || isAbsoluteUrl(value)) return value
  let normalized = value
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`
  }
  if (normalized.startsWith('/api/')) {
    return `${PUBLIC_BASE_URL}${normalized.replace(/^\/api/, '')}`
  }
  return `${PUBLIC_BASE_URL}${normalized}`
}

const ATTACHMENT_SPEC_KEYS = ['design_files', 'files', 'attachments', 'uploaded_files', 'documents', 'images']

const normalizeAttachmentEntry = (
  entry: any,
  orderItemId?: number,
  originLabel?: string
): NormalizedAttachment | null => {
  if (!entry) return null

  if (typeof entry === 'string') {
    const trimmed = entry.trim()
    if (!trimmed || trimmed.startsWith(':')) return null

    if (isDataUrl(trimmed)) {
      const mimeMatch = trimmed.match(/^data:([^;]+);/)
      const mimeType = mimeMatch ? mimeMatch[1] : ''
      const isImageFromMime = mimeType.startsWith('image/')
      const isPDFFromMime = mimeType.includes('pdf') || trimmed.startsWith('data:application/pdf')

      let filename = 'ملف'
      const filenameMatch = trimmed.match(/filename=([^;]+)/)
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1])
      } else if (isPDFFromMime) {
        filename = 'ملف.pdf'
      } else if (isImageFromMime) {
        const ext = mimeType.split('/')[1]?.split(';')[0] || 'png'
        filename = `صورة.${ext}`
      } else if (mimeType) {
        const ext = mimeType.split('/')[1]?.split(';')[0] || 'bin'
        filename = `ملف.${ext}`
      } else {
        filename = extractFileName(trimmed) || 'ملف'
      }

      return {
        url: trimmed,
        filename,
        isImage: isImageFromMime && !isPDFFromMime,
        orderItemId,
        originLabel,
        data_url: trimmed,
      }
    }

    const url = resolveToAbsoluteUrl(trimmed)
    if (!url) return null
    return {
      url,
      filename: extractFileName(trimmed) || 'ملف',
      isImage: looksLikeImage(trimmed),
      orderItemId,
      originLabel,
    }
  }

  if (typeof entry === 'object') {
    const rawUrl =
      entry.url ||
      entry.file_url ||
      entry.download_url ||
      entry.raw_path ||
      entry.path ||
      entry.file ||
      entry.href ||
      entry.location_url ||
      entry.data_url ||
      entry.data ||
      entry.src ||
      ''

    const rawUrlString = String(rawUrl || '').trim()
    let url = ''

    if (rawUrlString && isDataUrl(rawUrlString)) {
      url = rawUrlString
    } else if (rawUrlString) {
      url = rawUrlString.startsWith('http') || rawUrlString.startsWith('/') ? resolveToAbsoluteUrl(rawUrlString) : resolveToAbsoluteUrl(rawUrlString)
    }

    if (!url && entry.location) {
      const locationUrl = String(entry.location).trim()
      if (isDataUrl(locationUrl)) url = locationUrl
      else if (locationUrl.startsWith('http') || locationUrl.startsWith('/')) url = resolveToAbsoluteUrl(locationUrl)
    }

    if (!url) return null

    const filename =
      entry.filename ||
      entry.name ||
      extractFileName(rawUrlString) ||
      extractFileName(url) ||
      'ملف'

    const mimeType = String(entry.mime_type || '').toLowerCase()
    const isPDFFromMime = mimeType.includes('pdf') || String(url).startsWith('data:application/pdf')
    const isImageFromMime = mimeType.startsWith('image/')

    return {
      url,
      filename: String(filename),
      isImage: (isImageFromMime && !isPDFFromMime) || looksLikeImage(String(filename)) || looksLikeImage(String(url)),
      location: entry.location ? String(entry.location) : undefined,
      sizeLabel: entry.size_label || prettyFileSize(entry.size_in_bytes),
      orderItemId,
      originLabel,
      data_url: entry.data_url,
      file_exists: entry.file_exists,
    }
  }

  return null
}

const dedupeAttachments = (attachments: NormalizedAttachment[]) => {
  const seen = new Set<string>()
  const result: NormalizedAttachment[] = []

  for (const a of attachments) {
    const key = `${a.url}::${a.filename}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(a)
  }
  return result
}

const collectAttachmentsFromSpecs = (specs?: Record<string, any>, existingAttachments: NormalizedAttachment[] = []) => {
  if (!specs || typeof specs !== 'object') return []

  const existingUrls = new Set(existingAttachments.map(a => a.url).filter(Boolean))
  const existingFilenames = new Set(existingAttachments.map(a => a.filename).filter(Boolean))
  const entries: any[] = []

  ATTACHMENT_SPEC_KEYS.forEach((key) => {
    const value = specs[key]
    if (!value) return
    if (Array.isArray(value)) entries.push(...value)
    else entries.push(value)
  })

  // Fallback: scan for file-ish keys (but avoid duplicates)
  Object.entries(specs).forEach(([key, value]) => {
    const keyLower = key.toLowerCase()
    if (ATTACHMENT_SPEC_KEYS.includes(key)) return
    const isPotentialFileKey = keyLower.includes('file') || keyLower.includes('image') || keyLower.includes('attachment') || keyLower.includes('upload') || keyLower.includes('document')
    if (!isPotentialFileKey || !value) return
    if (Array.isArray(value)) entries.push(...value)
    else entries.push(value)
  })

  const normalized: NormalizedAttachment[] = []
  for (const entry of entries) {
    const candidate = normalizeAttachmentEntry(entry)
    if (!candidate) continue
    if (existingUrls.has(candidate.url) || existingFilenames.has(candidate.filename)) continue
    existingUrls.add(candidate.url)
    existingFilenames.add(candidate.filename)
    normalized.push(candidate)
  }
  return normalized
}

export const collectAttachmentsFromOrder = (order: any): NormalizedAttachment[] => {
  if (!order) return []

  const all: NormalizedAttachment[] = []

  // 1) Top-level attachments if provided by backend
  if (Array.isArray(order.attachments)) {
    for (const a of order.attachments as OrderAttachment[]) {
      const raw = a?.url || a?.download_url || a?.data_url || a?.raw_path || ''
      const normalized = normalizeAttachmentEntry(raw || a, a?.order_item_id, a?.order_item_service_name)
      if (normalized) all.push(normalized)
    }
  }

  // 2) Order items
  if (Array.isArray(order.items)) {
    for (const item of order.items) {
      const originLabel = item?.service_name || item?.product_name || undefined
      const itemId = item?.id

      // design_files explicit
      if (Array.isArray(item?.design_files)) {
        for (const entry of item.design_files) {
          const normalized = normalizeAttachmentEntry(entry, itemId, originLabel)
          if (normalized) all.push(normalized)
        }
      }

      // common attachment keys
      for (const key of ['files', 'attachments', 'uploaded_files', 'documents', 'images']) {
        const v = item?.[key]
        if (!v) continue
        if (Array.isArray(v)) {
          for (const entry of v) {
            const normalized = normalizeAttachmentEntry(entry, itemId, originLabel)
            if (normalized) all.push(normalized)
          }
        } else {
          const normalized = normalizeAttachmentEntry(v, itemId, originLabel)
          if (normalized) all.push(normalized)
        }
      }

      // specifications scan
      const fromSpecs = collectAttachmentsFromSpecs(item?.specifications, all)
      all.push(...fromSpecs.map(a => ({ ...a, orderItemId: itemId, originLabel })))
    }
  }

  return dedupeAttachments(all).filter(a => Boolean(a.url))
}


