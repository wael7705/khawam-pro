const API_BASE_URL = (import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api').replace(/\/$/, '')
const PUBLIC_BASE_URL = API_BASE_URL.replace(/\/api$/, '')

const isDataUrl = (value: string) => /^data:/i.test(value)
const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith('blob:')
const looksLikeImage = (value: string) => /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff)$/i.test(value)

const resolveToAbsoluteUrl = (value?: string) => {
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

type OrderAttachment = {
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
      } else {
        if (isPDFFromMime) {
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
      }
      
      return {
        url: trimmed,
        filename: filename,
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
    
    const rawUrlString = String(rawUrl).trim()
    let url = ''
    
    if (rawUrlString && isDataUrl(rawUrlString)) {
      url = rawUrlString
    } else if (rawUrlString) {
      if (rawUrlString.startsWith('http://') || rawUrlString.startsWith('https://')) {
        url = rawUrlString
      } else if (rawUrlString.startsWith('/uploads/') || rawUrlString.startsWith('/')) {
        url = resolveToAbsoluteUrl(rawUrlString)
      } else if (!rawUrlString.startsWith(':')) {
        url = resolveToAbsoluteUrl(rawUrlString)
      }
    }

    if (!url && entry.location) {
      const locationUrl = String(entry.location).trim()
      if (isDataUrl(locationUrl)) {
        url = locationUrl
      } else if (locationUrl.startsWith('http') || locationUrl.startsWith('/')) {
        url = resolveToAbsoluteUrl(locationUrl)
      }
    }

    if (!url && entry.filename) {
      const filename = String(entry.filename).trim()
      if (filename.includes('/')) {
        url = resolveToAbsoluteUrl(filename)
      } else {
        url = resolveToAbsoluteUrl(`/uploads/${filename}`)
      }
    }

    if (!url) return null

    const filename =
      entry.filename ||
      entry.original_name ||
      entry.name ||
      extractFileName(rawUrlString) ||
      'ملف'

    const mimeType = entry.mime_type || entry.mimetype || entry.content_type || ''
    const sizeLabel = entry.size_label || prettyFileSize(entry.size || entry.file_size || entry.size_in_bytes)
    
    let isImage = false
    if (isDataUrl(url)) {
      isImage = url.startsWith('data:image/')
    } else {
      if (mimeType) {
        isImage = mimeType.toLowerCase().includes('image')
      }
      if (!isImage) {
        isImage = looksLikeImage(url) || looksLikeImage(filename)
      }
      if (filename.toLowerCase().endsWith('.pdf') || 
          url.toLowerCase().includes('.pdf') || 
          mimeType.toLowerCase().includes('pdf') ||
          url.startsWith('data:application/pdf')) {
        isImage = false
      }
    }

    const dataUrl = entry.data_url && isDataUrl(String(entry.data_url)) ? String(entry.data_url) : undefined
    const preservedDataUrl = (!isDataUrl(url) && dataUrl) ? dataUrl : (isDataUrl(url) ? url : undefined)
    
    return {
      url,
      filename,
      isImage,
      location: entry.location || entry.position || entry.side || undefined,
      sizeLabel,
      orderItemId,
      originLabel,
      data_url: preservedDataUrl,
      file_exists: entry.file_exists,
    }
  }

  return null
}

const mapAttachmentToNormalized = (attachment: OrderAttachment): NormalizedAttachment | null => {
  if (!attachment) return null
  const raw = attachment.url || attachment.download_url || attachment.data_url || attachment.raw_path || ''
  const normalized = normalizeAttachmentEntry(
    raw || attachment,
    attachment.order_item_id,
    attachment.order_item_service_name
  )
  if (!normalized) return null
  if (!normalized.orderItemId && attachment.order_item_id) {
    normalized.orderItemId = attachment.order_item_id
  }
  if (!normalized.originLabel && attachment.order_item_service_name) {
    normalized.originLabel = attachment.order_item_service_name
  }
  if (!normalized.location && attachment.location) {
    normalized.location = attachment.location
  }
  if (!normalized.sizeLabel) {
    normalized.sizeLabel = attachment.size_label || prettyFileSize(attachment.size_in_bytes)
  }
  if (attachment.data_url && !normalized.data_url) {
    normalized.data_url = attachment.data_url
  }
  if (attachment.file_exists !== undefined && normalized.file_exists === undefined) {
    normalized.file_exists = attachment.file_exists
  }
  if (normalized.url && !isDataUrl(normalized.url) && attachment.data_url && isDataUrl(attachment.data_url)) {
    normalized.data_url = attachment.data_url
  }
  return normalized
}

const dedupeAttachments = (attachments: NormalizedAttachment[]) => {
  const seen = new Set<string>()
  const result: NormalizedAttachment[] = []

  attachments.forEach((attachment) => {
    const key = attachment.url
      ? `${attachment.url}|${attachment.location || ''}|${attachment.orderItemId ?? 'order'}`
      : `${attachment.orderItemId ?? 'order'}|${attachment.filename}|${attachment.location || ''}`
    if (attachment.url && !seen.has(key)) {
      seen.add(key)
      result.push(attachment)
    }
  })

  return result
}

/**
 * Collects and normalizes attachments from an order object
 */
export const collectOrderAttachments = (order: any): NormalizedAttachment[] => {
  const attachments: NormalizedAttachment[] = []
  
  // Collect from order.items if they exist
  if (order.items && Array.isArray(order.items)) {
    order.items.forEach((item: any) => {
      // Collect from design_files
      if (item.design_files) {
        let filesToProcess: any[] = []
        if (Array.isArray(item.design_files)) {
          filesToProcess = item.design_files.filter((f: any) => f !== null && f !== undefined && f !== '')
        } else if (typeof item.design_files === 'string') {
          try {
            const parsed = JSON.parse(item.design_files)
            if (Array.isArray(parsed)) {
              filesToProcess = parsed
            }
          } catch {
            filesToProcess = [item.design_files]
          }
        }
        
        filesToProcess.forEach((file: any) => {
          const normalized = normalizeAttachmentEntry(file, item.id, item.service_name)
          if (normalized) attachments.push(normalized)
        })
      }
      
      // Collect from specifications
      if (item.specifications && typeof item.specifications === 'object') {
        Object.entries(item.specifications).forEach(([key, value]: [string, any]) => {
          if (['design_files', 'files', 'attachments', 'uploaded_files', 'documents', 'images'].includes(key)) {
            const items = Array.isArray(value) ? value : [value]
            items.forEach((entry: any) => {
              if (entry) {
                const normalized = normalizeAttachmentEntry(entry, item.id, item.service_name)
                if (normalized) attachments.push(normalized)
              }
            })
          }
        })
      }
    })
  }
  
  return dedupeAttachments(attachments)
}

