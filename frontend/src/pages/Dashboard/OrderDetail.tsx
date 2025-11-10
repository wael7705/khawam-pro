import { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageSquare, Save, MapPin, ExternalLink, Download, FileText, Paperclip, Navigation, Share2, Plus } from 'lucide-react'
import { adminAPI, ordersAPI } from '../../lib/api'
import { showSuccess, showError } from '../../utils/toast'
import SimpleMap from '../../components/SimpleMap'
import './OrderDetail.css'

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

type NormalizedAttachment = {
  url: string
  filename: string
  isImage: boolean
  location?: string
  sizeLabel?: string
  orderItemId?: number
  originLabel?: string
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
}

const ATTACHMENT_SPEC_KEYS = ['design_files', 'files', 'attachments', 'uploaded_files', 'documents', 'images']

const normalizeAttachmentEntry = (
  entry: any,
  orderItemId?: number,
  originLabel?: string
): NormalizedAttachment | null => {
  if (!entry) {
    console.log('⚠️ normalizeAttachmentEntry: entry is null/undefined')
    return null
  }

  console.log('🔍 normalizeAttachmentEntry:', {
    entry,
    entry_type: typeof entry,
    entry_is_string: typeof entry === 'string',
    entry_is_object: typeof entry === 'object',
    isDataUrl: typeof entry === 'string' && isDataUrl(entry)
  })

  if (typeof entry === 'string') {
    const trimmed = entry.trim()
    if (!trimmed || trimmed.startsWith(':')) {
      console.log('⚠️ Invalid string entry:', trimmed)
      return null
    }
    
    // إذا كانت data URL، استخدمها مباشرة بدون resolve
    if (isDataUrl(trimmed)) {
      console.log('✅ Found data URL:', trimmed.substring(0, 50) + '...')
      
      // استخراج MIME type من data URL
      const mimeMatch = trimmed.match(/^data:([^;]+);/)
      const mimeType = mimeMatch ? mimeMatch[1] : ''
      const isImageFromMime = mimeType.startsWith('image/')
      const isPDFFromMime = mimeType.includes('pdf') || trimmed.startsWith('data:application/pdf')
      
      // استخراج اسم الملف من data URL إذا كان موجوداً
      let filename = 'ملف'
      const filenameMatch = trimmed.match(/filename=([^;]+)/)
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1])
      } else {
        // محاولة استخراج من MIME type
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
      
      const result = {
        url: trimmed, // استخدم data URL مباشرة
        filename: filename,
        isImage: isImageFromMime && !isPDFFromMime,
        orderItemId,
        originLabel,
      }
      console.log('✅ Returning data URL attachment:', result)
      return result
    }
    
    // للروابط الأخرى، استخدم resolveToAbsoluteUrl
    const url = resolveToAbsoluteUrl(trimmed)
    if (!url) {
      console.log('⚠️ Failed to resolve URL:', trimmed)
      return null
    }
    console.log('✅ Resolved URL:', url)
    return {
      url,
      filename: extractFileName(trimmed) || 'ملف',
      isImage: looksLikeImage(trimmed),
      orderItemId,
      originLabel,
    }
  }

  if (typeof entry === 'object') {
    console.log('🔍 Processing object entry:', Object.keys(entry), entry)
    
    // البحث عن URL في جميع المفاتيح المحتملة
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
    console.log('🔍 Raw URL string from object:', rawUrlString ? rawUrlString.substring(0, 100) : 'empty')
    
    let url = ''
    
    // إذا كانت data URL، استخدمها مباشرة (لكن تحقق من الحجم)
    if (rawUrlString && isDataUrl(rawUrlString)) {
      const dataUrlSize = rawUrlString.length
      if (dataUrlSize > 100000) { // أكثر من ~100KB
        console.warn(`⚠️ Large data URL detected (${dataUrlSize} bytes), trying to use file path instead`)
        // حاول استخدام raw_path أو path إذا كان موجوداً
        const filePath = entry.raw_path || entry.path || entry.file
        if (filePath && !isDataUrl(String(filePath)) && (String(filePath).startsWith('/uploads/') || String(filePath).startsWith('http'))) {
          console.log('✅ Using file path instead of large data URL:', filePath)
          url = resolveToAbsoluteUrl(String(filePath))
        } else {
          // إذا لم يكن هناك مسار ملف، استخدم data URL (لكن قد يسبب مشاكل)
          console.warn('⚠️ No file path found, using large data URL (may cause performance issues)')
          url = rawUrlString
        }
      } else {
        console.log('✅ Found data URL in object:', rawUrlString.substring(0, 50) + '...')
        url = rawUrlString
      }
    } else if (rawUrlString) {
      // للروابط النسبية أو المطلقة
      if (rawUrlString.startsWith('http://') || rawUrlString.startsWith('https://')) {
        url = rawUrlString
        console.log('✅ Found absolute URL:', url)
      } else if (rawUrlString.startsWith('/uploads/') || rawUrlString.startsWith('/')) {
        // رابط نسبي يبدأ بـ /uploads/
        url = resolveToAbsoluteUrl(rawUrlString)
        console.log('✅ Resolved relative URL:', url)
      } else if (!rawUrlString.startsWith(':')) {
        // أي رابط آخر غير فارغ
        url = resolveToAbsoluteUrl(rawUrlString)
        console.log('✅ Resolved URL from object:', url)
      }
    }

    // إذا لم نجد URL بعد، جرب entry.location
    if (!url && entry.location) {
      const locationUrl = String(entry.location).trim()
      console.log('🔍 Trying location URL:', locationUrl.substring(0, 50))
      if (isDataUrl(locationUrl)) {
        url = locationUrl
        console.log('✅ Found data URL in location')
      } else if (locationUrl.startsWith('http') || locationUrl.startsWith('/')) {
        url = resolveToAbsoluteUrl(locationUrl)
        console.log('✅ Resolved location URL:', url)
      }
    }

    // إذا لم نجد URL بعد، قد يكون entry نفسه هو data URL ككائن
    if (!url && typeof entry === 'object' && entry.toString) {
      const entryString = entry.toString()
      if (entryString && (isDataUrl(entryString) || entryString.startsWith('http') || entryString.startsWith('/'))) {
        if (isDataUrl(entryString)) {
          url = entryString
          console.log('✅ Found data URL in entry.toString()')
        } else {
          url = resolveToAbsoluteUrl(entryString)
          console.log('✅ Found URL in entry.toString():', url)
        }
      }
    }

    // إذا لم نجد URL بعد، لكن لدينا filename، جرب إنشاء URL من filename
    if (!url && entry.filename) {
      const filename = String(entry.filename).trim()
      if (filename) {
        // إذا كان filename يحتوي على مسار
        if (filename.includes('/')) {
          url = resolveToAbsoluteUrl(filename)
          console.log('✅ Created URL from filename with path:', url)
        } else {
          // إذا كان filename فقط، أضفه إلى /uploads/
          url = resolveToAbsoluteUrl(`/uploads/${filename}`)
          console.log('✅ Created URL from filename:', url)
        }
      }
    }

    if (!url) {
      console.warn('⚠️ No URL found in object entry after all attempts:', {
        entry,
        keys: Object.keys(entry),
        rawUrl: rawUrlString,
        location: entry.location,
        filename: entry.filename
      })
      return null
    }

    const filename =
      entry.filename ||
      entry.original_name ||
      entry.name ||
      extractFileName(rawUrlString) ||
      'ملف'

    const mimeType = entry.mime_type || entry.mimetype || entry.content_type || ''
    const sizeLabel = entry.size_label || prettyFileSize(entry.size || entry.file_size || entry.size_in_bytes)
    
    // تحديد إذا كانت صورة - للdata URLs، تحقق من MIME type
    let isImage = false
    if (isDataUrl(url)) {
      isImage = url.startsWith('data:image/')
      console.log('✅ Detected image from data URL MIME type:', isImage, url.substring(0, 30))
    } else {
      // التحقق من MIME type أولاً
      if (mimeType) {
        isImage = mimeType.toLowerCase().includes('image')
        console.log('✅ Detected from MIME type:', { mimeType, isImage })
      }
      // إذا لم يكن MIME type موجوداً، تحقق من الامتداد
      if (!isImage) {
        isImage = looksLikeImage(url) || looksLikeImage(filename)
        console.log('✅ Detected from file extension:', { url, filename, isImage })
      }
      // إذا كان ملف PDF أو مستند، لا تعتبره صورة
      if (filename.toLowerCase().endsWith('.pdf') || 
          url.toLowerCase().includes('.pdf') || 
          mimeType.toLowerCase().includes('pdf') ||
          url.startsWith('data:application/pdf')) {
        isImage = false
        console.log('✅ Detected PDF file, not an image')
      }
    }

    const result = {
      url,
      filename,
      isImage,
      location: entry.location || entry.position || entry.side || undefined,
      sizeLabel,
      orderItemId,
      originLabel,
    }
    console.log('✅ Returning normalized attachment:', result)
    return result
  }

  console.warn('⚠️ Unknown entry type:', typeof entry, entry)
  return null
}

const mapAttachmentToNormalized = (attachment: OrderAttachment): NormalizedAttachment | null => {
  if (!attachment) return null
  const raw = attachment.url || attachment.download_url || attachment.raw_path || ''
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

const isEmptyValue = (value: any) => {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

const SPEC_LABELS: Record<string, string> = {
  clothing_source: 'مصدر الملابس',
  clothing_product: 'نوع المنتج',
  clothing_color: 'لون المنتج',
  quantity: 'الكمية',
  design_positions: 'مواقع الطباعة',
  notes: 'ملاحظات إضافية',
  work_type: 'نوع العمل',
  paper_size: 'قياس الورق',
  total_pages: 'عدد الصفحات',
  number_of_pages: 'عدد الصفحات',
  print_color: 'نوع الطباعة',
  print_quality: 'جودة الطباعة',
  print_sides: 'عدد الأوجه',
  selected_colors: 'الألوان المختارة',
  auto_colors: 'ألوان مقترحة',
  colors: 'الألوان',
  dimensions: 'الأبعاد',
  width: 'العرض',
  height: 'الارتفاع',
  length: 'الطول',
  unit: 'الوحدة',
  location: 'الموضع',
  filename: 'اسم الملف',
  delivery_type: 'نوع التوصيل',
  service_name: 'الخدمة',
  uploaded_files: 'ملفات مرفوعة',
  attachments: 'مرفقات',
  images: 'صور',
  documents: 'مستندات',
}

const translateSpecKey = (key: string) => {
  if (SPEC_LABELS[key]) return SPEC_LABELS[key]
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (str) => str.toUpperCase())
}

const renderSpecValue = (value: any): ReactNode => {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) {
    if (value.length === 0) return '—'
    if (typeof value[0] === 'object' && value[0] !== null) {
      return (
        <ul className="spec-nested-list">
          {value.map((entry, index) => (
            <li key={index} className="spec-nested-item">
              {Object.entries(entry).map(([subKey, subValue]) => (
                <div key={subKey} className="spec-nested-row">
                  <strong>{translateSpecKey(subKey)}:</strong>{' '}
                  <span>{renderSpecValue(subValue)}</span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )
    }
    return value.join(', ')
  }
  if (typeof value === 'object') {
    return (
      <ul className="spec-nested-list">
        {Object.entries(value).map(([subKey, subValue]) => (
          <li key={subKey} className="spec-nested-item">
            <strong>{translateSpecKey(subKey)}:</strong>{' '}
            <span>{renderSpecValue(subValue)}</span>
          </li>
        ))}
      </ul>
    )
  }
  if (typeof value === 'boolean') {
    return value ? 'نعم' : 'لا'
  }
  return String(value)
}

const renderAttachmentsGrid = (files: NormalizedAttachment[]) => {
  if (!files || files.length === 0) return null
  
  console.log('🎨 renderAttachmentsGrid - Rendering', files.length, 'files')
  files.forEach((file, idx) => {
    console.log(`  File[${idx}]:`, {
      filename: file.filename,
      url: file.url.substring(0, 50),
      isImage: file.isImage,
      location: file.location
    })
  })
  
  return (
    <div className="attachments-grid">
      {files.map((file, idx) => {
        const locationLabel = file.location || file.originLabel
        const fileExtension = file.filename.split('.').pop()?.toLowerCase() || ''
        const isPDF = fileExtension === 'pdf' || file.url.includes('.pdf') || file.url.startsWith('data:application/pdf')
        const isDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(fileExtension)
        
        return (
          <div key={`${file.url}-${file.filename}-${idx}`} className="attachment-card">
            <div className={`attachment-preview ${file.isImage ? 'image' : isPDF ? 'pdf' : isDocument ? 'document' : 'file'}`}>
              {file.isImage ? (
                <img 
                  src={file.url} 
                  alt={file.filename} 
                  loading="lazy" 
                  onError={(e) => {
                    console.error('❌ Error loading image:', file.url, file.filename)
                    // إذا فشل تحميل الصورة، استبدلها بأيقونة
                    const target = e.currentTarget as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      // إنشاء عنصر div مع أيقونة
                      const iconDiv = document.createElement('div')
                      iconDiv.style.display = 'flex'
                      iconDiv.style.alignItems = 'center'
                      iconDiv.style.justifyContent = 'center'
                      iconDiv.style.width = '100%'
                      iconDiv.style.height = '100%'
                      iconDiv.style.flexDirection = 'column'
                      iconDiv.style.gap = '8px'
                      iconDiv.innerHTML = `
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                          <line x1="16" y1="13" x2="8" y2="13"></line>
                          <line x1="16" y1="17" x2="8" y2="17"></line>
                          <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                        <span style="font-size: 10px; color: #666;">خطأ في التحميل</span>
                      `
                      parent.appendChild(iconDiv)
                    }
                  }}
                  onLoad={() => {
                    console.log('✅ Image loaded successfully:', file.url)
                  }}
                />
              ) : isPDF ? (
                <div className="file-icon pdf-icon">
                  <FileText size={32} />
                  <span className="file-extension">PDF</span>
                </div>
              ) : (
                <div className="file-icon">
                  <FileText size={26} />
                  {fileExtension && <span className="file-extension">{fileExtension.toUpperCase()}</span>}
                </div>
              )}
            </div>
            <div className="attachment-meta">
              {locationLabel && <span className="attachment-location">{locationLabel}</span>}
              <span className="attachment-name" title={file.filename}>{file.filename}</span>
              {file.sizeLabel && <span className="attachment-size">{file.sizeLabel}</span>}
              <div className="attachment-actions">
                <button
                  className="attachment-action"
                  type="button"
                  onClick={async () => {
                    console.log('🔗 Opening file:', file.url, file.filename)
                    try {
                      // التحقق من أن الملف موجود قبل فتحه
                      if (file.url.startsWith('data:')) {
                        // Data URL - يمكن فتحه مباشرة
                        window.open(file.url, '_blank', 'noopener,noreferrer')
                      } else {
                        // للروابط العادية، جرب فتحها مع معالجة الأخطاء
                        const newWindow = window.open(file.url, '_blank', 'noopener,noreferrer')
                        if (!newWindow) {
                          // إذا فشل فتح النافذة (مثلاً بسبب popup blocker)، جرب التحميل
                          const link = document.createElement('a')
                          link.href = file.url
                          link.download = file.filename || 'attachment'
                          link.target = '_blank'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        } else {
                          // تحقق من أن الملف تم تحميله بنجاح بعد ثانية
                          setTimeout(() => {
                            try {
                              if (newWindow.location.href === 'about:blank') {
                                console.warn('⚠️ File may not have loaded:', file.url)
                              }
                            } catch (e) {
                              // Cross-origin error - هذا طبيعي
                            }
                          }, 1000)
                        }
                      }
                    } catch (error) {
                      console.error('❌ Error opening file:', error)
                      showError('فشل فتح الملف. يرجى المحاولة مرة أخرى.')
                    }
                  }}
                  title="عرض الملف"
                >
                  <ExternalLink size={16} />
                  عرض
                </button>
                <button
                  className="attachment-action"
                  type="button"
                  onClick={async () => {
                    console.log('💾 Downloading file:', file.url, file.filename)
                    try {
                      // للـ data URLs، استخدم blob
                      if (file.url.startsWith('data:')) {
                        const response = await fetch(file.url)
                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = file.filename || 'attachment'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        window.URL.revokeObjectURL(url)
                      } else {
                        // للروابط العادية، استخدم fetch للتحقق من وجود الملف
                        try {
                          const response = await fetch(file.url, { method: 'HEAD' })
                          if (response.ok) {
                            // الملف موجود، قم بالتحميل
                            const link = document.createElement('a')
                            link.href = file.url
                            link.download = file.filename || 'attachment'
                            link.target = '_blank'
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          } else {
                            // الملف غير موجود، عرض رسالة خطأ
                            console.error('❌ File not found:', file.url, response.status)
                            showError(`الملف غير موجود (${response.status}). قد يكون الملف محذوفاً أو الرابط غير صحيح.`)
                          }
                        } catch (fetchError) {
                          // إذا فشل HEAD request (مثلاً بسبب CORS)، جرب التحميل مباشرة
                          console.warn('⚠️ HEAD request failed, trying direct download:', fetchError)
                          const link = document.createElement('a')
                          link.href = file.url
                          link.download = file.filename || 'attachment'
                          link.target = '_blank'
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                        }
                      }
                    } catch (error) {
                      console.error('❌ Error downloading file:', error)
                      showError('فشل تحميل الملف. يرجى المحاولة مرة أخرى.')
                    }
                  }}
                  title="تحميل الملف"
                >
                  <Download size={16} />
                  تحميل
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SPEC_EXCLUDED_KEYS = new Set([
  ...ATTACHMENT_SPEC_KEYS,
  'dimensions',
  'colors',
  'selected_colors',
  'auto_colors',
  'work_type',
  'print_color',
  'print_sides',
  'number_of_pages',
  'total_pages',
  'paper_size',
  'delivery_type',
  'notes',
  'quantity',
  'clothing_source_value',
  'clothing_product_code',
  'clothing_color_code',
])

interface OrderItem {
  id: number
  product_id?: number
  product_name: string
  service_name?: string
  order_type?: 'product' | 'service'
  quantity: number
  unit_price: number
  total_price: number
  specifications?: Record<string, any>
  design_files?: any[]
  status: string
}

interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_whatsapp: string
  shop_name?: string
  status: string
  delivery_type: string
  total_amount: number
  final_amount: number
  payment_status: string
  delivery_address?: string
  delivery_latitude?: number
  delivery_longitude?: number
  notes?: string
  staff_notes?: string
  created_at: string
  items: OrderItem[]
  image_url?: string
  order_type?: 'product' | 'service'
  total_quantity?: number
}

const collectAttachmentsFromSpecs = (specs?: Record<string, any>) => {
  if (!specs || typeof specs !== 'object') {
    console.log('🔍 collectAttachmentsFromSpecs - specs is null/undefined or not an object')
    return []
  }
  const entries: any[] = []

  console.log('🔍 collectAttachmentsFromSpecs - specs keys:', Object.keys(specs))
  console.log('🔍 collectAttachmentsFromSpecs - full specs:', JSON.stringify(specs, null, 2).substring(0, 500))

  // أولاً: ابحث في المفاتيح المعروفة للمرفقات
  ATTACHMENT_SPEC_KEYS.forEach((key) => {
    const value = specs[key]
    if (!value) {
      console.log(`  ⏭️ Key "${key}" is empty or null`)
      return
    }
    console.log(`  🔍 Checking key "${key}":`, {
      value_type: typeof value,
      is_array: Array.isArray(value),
      is_string: typeof value === 'string',
      is_object: typeof value === 'object',
      value_preview: typeof value === 'string' ? value.substring(0, 100) : (Array.isArray(value) ? `Array[${value.length}]` : JSON.stringify(value).substring(0, 100))
    })
    
    if (Array.isArray(value)) {
      const validEntries = value.filter(v => v !== null && v !== undefined && v !== '')
      if (validEntries.length > 0) {
        entries.push(...validEntries)
        console.log(`  ✅ Added ${validEntries.length} entries from ${key}`)
      } else {
        console.log(`  ⚠️ Array in "${key}" is empty or contains only null/undefined values`)
      }
    } else if (typeof value === 'string') {
      // إذا كانت سلسلة، حاول تحليلها كـ JSON
      if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed)) {
            const validEntries = parsed.filter(v => v !== null && v !== undefined && v !== '')
            if (validEntries.length > 0) {
              entries.push(...validEntries)
              console.log(`  ✅ Parsed and added ${validEntries.length} entries from ${key} (JSON string)`)
            }
          } else if (parsed !== null && parsed !== undefined) {
            entries.push(parsed)
            console.log(`  ✅ Parsed and added 1 entry from ${key} (JSON string)`)
          }
        } catch (e) {
          // إذا فشل التحليل، تحقق إذا كانت data URL أو رابط
          if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/uploads/')) {
            entries.push(value)
            console.log(`  ✅ Added string URL from ${key}`)
          } else {
            console.log(`  ⚠️ Failed to parse JSON string in "${key}":`, e)
          }
        }
      } else if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/uploads/')) {
        entries.push(value)
        console.log(`  ✅ Added string URL from ${key}`)
      } else {
        console.log(`  ⏭️ String in "${key}" doesn't look like a file URL`)
      }
    } else if (typeof value === 'object' && value !== null) {
      entries.push(value)
      console.log(`  ✅ Added object from ${key}`)
    } else {
      console.log(`  ⏭️ Value in "${key}" is not a recognized type:`, typeof value)
    }
  })
  
  // ثانياً: ابحث في جميع المفاتيح التي قد تحتوي على ملفات (بما في ذلك المفاتيح المعروفة مرة أخرى للتأكد)
  Object.keys(specs).forEach((key) => {
    const value = specs[key]
    if (value === null || value === undefined || value === '') {
      return
    }
    
    const keyLower = key.toLowerCase()
    const wasAlreadyChecked = ATTACHMENT_SPEC_KEYS.includes(key)
    const isPotentialFileKey = keyLower.includes('file') || 
                               keyLower.includes('image') || 
                               keyLower.includes('design') || 
                               keyLower.includes('upload') || 
                               keyLower.includes('attachment') ||
                               keyLower.includes('pdf') ||
                               keyLower.includes('document') ||
                               keyLower.includes('url') ||
                               keyLower.includes('path')
    
    // إذا كان المفتاح يحتوي على كلمات مفتاحية للملفات أو كان من المفاتيح المعروفة
    if (isPotentialFileKey || wasAlreadyChecked) {
      // إذا تم فحصه بالفعل، تخطاه (لكن قد نحتاج إعادة فحصه إذا كانت القيمة مختلفة)
      if (wasAlreadyChecked && !isPotentialFileKey) {
        return
      }
      
      console.log(`  🔍 Examining key "${key}" (potential file key):`, {
        value_type: typeof value,
        is_array: Array.isArray(value),
        is_string: typeof value === 'string',
        is_object: typeof value === 'object',
        value_length: typeof value === 'string' ? value.length : (Array.isArray(value) ? value.length : 'N/A'),
        value_preview: typeof value === 'string' 
          ? (value.length > 200 ? value.substring(0, 200) + '...' : value)
          : (Array.isArray(value) 
              ? `Array[${value.length}]: ${JSON.stringify(value.slice(0, 2)).substring(0, 100)}`
              : JSON.stringify(value).substring(0, 200))
      })
      
      if (Array.isArray(value)) {
        value.forEach((item, idx) => {
          if (item && item !== null && item !== undefined && item !== '') {
            if (typeof item === 'string' || typeof item === 'object') {
              // إذا كانت سلسلة، تحقق إذا كانت data URL أو رابط
              if (typeof item === 'string') {
                if (item.startsWith('data:') || item.startsWith('http') || item.startsWith('/uploads/')) {
                  entries.push(item)
                  console.log(`    ✅ Added item[${idx}] from "${key}" (string URL)`)
                } else if (item.trim().startsWith('[') || item.trim().startsWith('{')) {
                  // محاولة تحليل JSON
                  try {
                    const parsed = JSON.parse(item)
                    if (Array.isArray(parsed)) {
                      entries.push(...parsed.filter(v => v !== null && v !== undefined))
                      console.log(`    ✅ Parsed and added ${parsed.length} items from "${key}"[${idx}] (JSON array)`)
                    } else {
                      entries.push(parsed)
                      console.log(`    ✅ Parsed and added item from "${key}"[${idx}] (JSON object)`)
                    }
                  } catch (e) {
                    console.log(`    ⚠️ Failed to parse JSON in "${key}"[${idx}]:`, e)
                  }
                }
              } else {
                entries.push(item)
                console.log(`    ✅ Added item[${idx}] from "${key}" (object)`)
              }
            }
          }
        })
      } else if (typeof value === 'string') {
        // إذا كانت سلسلة نصية، تحقق إذا كانت ملف
        if (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/uploads/')) {
          entries.push(value)
          console.log(`    ✅ Added string file from "${key}":`, value.substring(0, 50))
        } else if (value.trim().startsWith('[') || value.trim().startsWith('{')) {
          // محاولة تحليل JSON
          try {
            const parsed = JSON.parse(value)
            if (Array.isArray(parsed)) {
              const validEntries = parsed.filter(v => v !== null && v !== undefined && v !== '')
              if (validEntries.length > 0) {
                entries.push(...validEntries)
                console.log(`    ✅ Parsed and added ${validEntries.length} entries from "${key}" (JSON array string)`)
              }
            } else if (parsed !== null && parsed !== undefined) {
              entries.push(parsed)
              console.log(`    ✅ Parsed and added 1 entry from "${key}" (JSON object string)`)
            }
          } catch (e) {
            console.log(`    ⚠️ Failed to parse JSON string in "${key}":`, e)
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // تحقق إذا كان الكائن يحتوي على معلومات ملف
        if (value.url || value.file_url || value.download_url || value.raw_path || value.data_url || value.file || value.path || value.filename) {
          entries.push(value)
          console.log(`    ✅ Added object from "${key}" (has file properties)`)
        } else if (Array.isArray(Object.values(value))) {
          // إذا كانت القيم مصفوفات، افحصها
          Object.values(value).forEach((subValue: any, subIdx: number) => {
            if (Array.isArray(subValue)) {
              subValue.forEach((item: any) => {
                if (item && (typeof item === 'string' || typeof item === 'object')) {
                  entries.push(item)
                  console.log(`    ✅ Added nested item from "${key}"[${subIdx}]`)
                }
              })
            }
          })
        }
      }
    } else {
      // ثالثاً: حتى لو لم يكن المفتاح يحتوي على كلمات مفتاحية، تحقق من القيمة
      // قد تكون الملفات مخزنة في مفاتيح غير متوقعة
      if (Array.isArray(value) && value.length > 0) {
        // تحقق من أن العناصر قد تكون ملفات
        const firstItem = value[0]
        if (firstItem && (
          (typeof firstItem === 'string' && (firstItem.startsWith('data:') || firstItem.startsWith('http') || firstItem.startsWith('/uploads/'))) ||
          (typeof firstItem === 'object' && firstItem !== null && (
            firstItem.url || firstItem.file_url || firstItem.download_url || firstItem.raw_path || firstItem.data_url || firstItem.file || firstItem.path
          ))
        )) {
          console.log(`  🔍 Found file-like array in unexpected key "${key}":`, value.length, 'items')
          value.forEach((item: any) => {
            if (item && (typeof item === 'string' || typeof item === 'object')) {
              entries.push(item)
            }
          })
        }
      } else if (typeof value === 'string' && value.trim() && 
                 (value.startsWith('data:') || value.startsWith('http') || value.startsWith('/uploads/'))) {
        console.log(`  🔍 Found file-like string in unexpected key "${key}":`, value.substring(0, 50))
        entries.push(value)
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && (
        value.url || value.file_url || value.download_url || value.raw_path || value.data_url || value.file || value.path
      )) {
        console.log(`  🔍 Found file-like object in unexpected key "${key}":`, Object.keys(value))
        entries.push(value)
      }
    }
  })

  console.log(`✅ Total entries collected from specs: ${entries.length}`)
  if (entries.length > 0) {
    console.log(`✅ Entries preview:`, entries.slice(0, 3).map((e, i) => ({
      index: i,
      type: typeof e,
      is_string: typeof e === 'string',
      is_object: typeof e === 'object',
      string_preview: typeof e === 'string' ? e.substring(0, 100) : undefined,
      object_keys: typeof e === 'object' && e !== null ? Object.keys(e) : undefined
    })))
  }
  return entries
}

const collectItemAttachments = (item: OrderItem): NormalizedAttachment[] => {
  const entries: NormalizedAttachment[] = []
  
  console.log('🔍 collectItemAttachments - Item:', {
    id: item.id,
    design_files: item.design_files,
    design_files_type: typeof item.design_files,
    design_files_is_array: Array.isArray(item.design_files),
    specifications: item.specifications
  })
  
  // معالجة design_files - تحسين التعامل مع جميع الحالات
  if (item.design_files) {
    let filesToProcess: any[] = []
    
    if (Array.isArray(item.design_files)) {
      console.log(`✅ Found ${item.design_files.length} design_files in array`)
      filesToProcess = item.design_files.filter(f => f !== null && f !== undefined)
    } else if (typeof item.design_files === 'string') {
      // إذا كانت سلسلة نصية، حاول تحليلها كـ JSON
      try {
        const parsed = JSON.parse(item.design_files)
        if (Array.isArray(parsed)) {
          filesToProcess = parsed.filter(f => f !== null && f !== undefined)
        } else if (parsed !== null && parsed !== undefined) {
          filesToProcess = [parsed]
        } else {
          // إذا فشل التحليل، اعتبرها ملف واحد
          filesToProcess = [item.design_files]
        }
      } catch (e) {
        // إذا فشل التحليل، اعتبرها ملف واحد
        filesToProcess = [item.design_files]
      }
    } else if (typeof item.design_files === 'object') {
      // إذا كان كائناً، أضفه مباشرة
      filesToProcess = [item.design_files]
    }
    
    console.log(`📎 Processing ${filesToProcess.length} files from design_files`)
    filesToProcess.forEach((entry, idx) => {
      console.log(`  Processing design_file[${idx}]:`, {
        entry,
        entry_type: typeof entry,
        is_string: typeof entry === 'string',
        is_object: typeof entry === 'object',
        is_data_url: typeof entry === 'string' && isDataUrl(entry),
        object_keys: typeof entry === 'object' && entry !== null ? Object.keys(entry) : []
      })
      
      const normalized = normalizeAttachmentEntry(entry, item.id, item.service_name || item.product_name)
      if (normalized) {
        console.log(`  ✅ Normalized attachment:`, normalized)
        entries.push(normalized)
      } else {
        console.warn(`  ⚠️ Failed to normalize entry:`, entry)
        // إذا فشل التطبيع، حاول إضافة الملف كسلسلة إذا كان يحتوي على رابط
        if (typeof entry === 'string' && entry.trim() && 
            (entry.startsWith('data:') || entry.startsWith('http') || entry.startsWith('/uploads/'))) {
          console.log(`  🔄 Trying to add as string URL:`, entry.substring(0, 50))
          const fallbackNormalized = normalizeAttachmentEntry(entry, item.id, item.service_name || item.product_name)
          if (fallbackNormalized) {
            entries.push(fallbackNormalized)
          }
        }
      }
    })
  } else {
    console.log('⚠️ No design_files found in item')
  }

  const specEntries = collectAttachmentsFromSpecs(item.specifications)
  console.log(`📋 Found ${specEntries.length} attachments from specifications`)
  specEntries.forEach((entry, idx) => {
    console.log(`  Processing spec entry[${idx}]:`, entry)
    const normalized = normalizeAttachmentEntry(entry, item.id, item.service_name || item.product_name)
    if (normalized) {
      console.log(`  ✅ Normalized spec attachment:`, normalized)
      entries.push(normalized)
    }
  })

  console.log(`✅ Total attachments collected: ${entries.length}`)
  return dedupeAttachments(entries)
}

const collectAttachmentNameHints = (item: OrderItem): string[] => {
  const names = new Set<string>()
  const addName = (name?: string) => {
    if (name && name.trim()) {
      names.add(name.trim())
    }
  }

  if (Array.isArray(item.design_files)) {
    item.design_files.forEach((entry) => {
      if (typeof entry === 'string') {
        addName(extractFileName(entry) || entry)
      } else if (entry?.filename) {
        addName(entry.filename)
      } else if (entry?.name) {
        addName(entry.name)
      }
    })
  }

  const specEntries = collectAttachmentsFromSpecs(item.specifications)
  specEntries.forEach((entry) => {
    if (typeof entry === 'string') {
      addName(extractFileName(entry) || entry)
    } else if (entry?.filename) {
      addName(entry.filename)
    } else if (entry?.name) {
      addName(entry.name)
    }
  })

  return Array.from(names)
}

const buildGenericSpecEntries = (specs: Record<string, any> | undefined) => {
  if (!specs || typeof specs !== 'object') return []
  return Object.entries(specs).filter(([key, value]) => !SPEC_EXCLUDED_KEYS.has(key) && !isEmptyValue(value))
}

const STATUS_OPTIONS = [
  { id: 'pending', label: 'في الانتظار', color: '#F59E0B' },
  { id: 'accepted', label: 'تم القبول', color: '#3B82F6' },
  { id: 'preparing', label: 'قيد التحضير', color: '#8B5CF6' },
  { id: 'awaiting_pickup', label: 'في انتظار الاستلام', color: '#06B6D4' },
  { id: 'shipping', label: 'قيد التوصيل', color: '#10B981' },
  { id: 'completed', label: 'مكتمل', color: '#10B981' },
  { id: 'cancelled', label: 'ملغى', color: '#EF4444' },
  { id: 'rejected', label: 'مرفوض', color: '#EF4444' },
]

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [staffNotes, setStaffNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [showLocationMap, setShowLocationMap] = useState(false)
  const [orderAttachments, setOrderAttachments] = useState<NormalizedAttachment[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [showAdditionalAddress, setShowAdditionalAddress] = useState(false)

  useEffect(() => {
    // إزالة التحقق الصارم من Token - السماح بالوصول حتى بدون token
    // (سيتم التحقق في Backend)
    if (id) {
      loadOrder(parseInt(id, 10))
    }
  }, [id, navigate])

  const fetchOrderAttachments = async (orderId: number) => {
    try {
      setAttachmentsLoading(true)
      const response = await ordersAPI.getAttachments(orderId)
      const payload = Array.isArray(response.data?.attachments) ? response.data.attachments : []
      const normalized = dedupeAttachments(
        payload
          .map(mapAttachmentToNormalized)
          .filter((file): file is NormalizedAttachment => Boolean(file))
      )
      setOrderAttachments(normalized)
    } catch (error) {
      console.error('Error loading order attachments:', error)
      setOrderAttachments([])
    } finally {
      setAttachmentsLoading(false)
    }
  }

  const loadOrder = async (orderId: number) => {
    try {
      setLoading(true)
      setOrderAttachments([])
      console.log('🔄 Loading order:', orderId)
      const response = await adminAPI.orders.getById(orderId)
      console.log('📦 Order response:', response.data)
      
      if (response.data.success && response.data.order) {
        const orderData = response.data.order
        console.log('📋 Order data:', orderData)
        console.log('📋 Order items:', orderData.items)
        
        // Log delivery information
        console.log('📍 Delivery information:', {
          delivery_type: orderData.delivery_type,
          delivery_address: orderData.delivery_address,
          delivery_latitude: orderData.delivery_latitude,
          delivery_longitude: orderData.delivery_longitude,
          has_address: !!orderData.delivery_address,
          has_coordinates: !!(orderData.delivery_latitude && orderData.delivery_longitude),
          should_show_card: !!(orderData.delivery_address || (orderData.delivery_latitude && orderData.delivery_longitude))
        })
        
        // Log design_files and specifications for each item - تحسين التسجيل
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((item: any, idx: number) => {
            console.log(`📎 Item[${idx}] - Full item data:`, {
              item_id: item.id,
              product_name: item.product_name,
              service_name: item.service_name,
              design_files: item.design_files,
              design_files_type: typeof item.design_files,
              design_files_is_array: Array.isArray(item.design_files),
              design_files_length: Array.isArray(item.design_files) ? item.design_files.length : 'N/A',
              specifications: item.specifications,
              specifications_type: typeof item.specifications,
              specifications_keys: item.specifications && typeof item.specifications === 'object' ? Object.keys(item.specifications) : []
            })
            
            // تحقق من وجود ملفات في specifications
            if (item.specifications && typeof item.specifications === 'object') {
              const specKeys = Object.keys(item.specifications)
              console.log(`📎 Item[${idx}] - Checking specifications for files:`, specKeys)
              specKeys.forEach(key => {
                const value = item.specifications[key]
                if (Array.isArray(value) && value.length > 0) {
                  console.log(`  ✅ Found array in "${key}":`, value.length, 'items')
                  value.forEach((v: any, i: number) => {
                    console.log(`    [${i}]:`, typeof v, v && typeof v === 'object' ? Object.keys(v) : v)
                  })
                } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                  console.log(`  ✅ Found object in "${key}":`, Object.keys(value))
                } else if (value && typeof value === 'string' && (value.startsWith('data:') || value.startsWith('/uploads/') || value.startsWith('http'))) {
                  console.log(`  ✅ Found file URL in "${key}":`, value.substring(0, 50))
                }
              })
            }
          })
        }
        
        setOrder(orderData)
        setStaffNotes(orderData.staff_notes || '')
        fetchOrderAttachments(orderId)
      } else {
        showError('الطلب غير موجود')
        navigate('/dashboard/orders')
      }
    } catch (error: any) {
      console.error('❌ Error loading order:', error)
      showError('حدث خطأ في جلب تفاصيل الطلب')
      navigate('/dashboard/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveNotes = async () => {
    if (!order) return
    
    setIsSavingNotes(true)
    try {
      await adminAPI.orders.updateStaffNotes(order.id, staffNotes)
      setOrder({ ...order, staff_notes: staffNotes })
      showSuccess('تم حفظ الملاحظات بنجاح')
    } catch (error: any) {
      showError('فشل حفظ الملاحظات')
    } finally {
      setIsSavingNotes(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'في الانتظار',
      accepted: 'تم القبول',
      preparing: 'قيد التحضير',
      shipping: 'قيد التوصيل',
      awaiting_pickup: 'في انتظار الاستلام',
      completed: 'مكتمل',
      cancelled: 'ملغى',
      rejected: 'مرفوض',
    }
    return labels[status] || status
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      accepted: '#3B82F6',
      preparing: '#8B5CF6',
      shipping: '#10B981',
      awaiting_pickup: '#06B6D4',
      completed: '#10B981',
      cancelled: '#EF4444',
      rejected: '#EF4444',
    }
    return colors[status] || '#6B7280'
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!order || order.status === newStatus) return

    setIsUpdatingStatus(true)
    try {
      await adminAPI.orders.updateStatus(order.id, newStatus)
      setOrder({ ...order, status: newStatus })
      showSuccess(`تم تحديث حالة الطلب إلى: ${getStatusLabel(newStatus)}`)
    } catch (error: any) {
      console.error('Error updating status:', error)
      showError('فشل تحديث حالة الطلب')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    window.open(`https://wa.me/${cleanPhone}`, '_blank')
  }

  const attachmentsByItem = useMemo(() => {
    if (!order) return {}

    const map: Record<number, NormalizedAttachment[]> = {}
    const pushAttachment = (target: number, attachment: NormalizedAttachment) => {
      if (!map[target]) map[target] = []
      map[target].push(attachment)
    }

    orderAttachments.forEach((attachment) => {
      if (attachment.orderItemId !== undefined && attachment.orderItemId !== null) {
        pushAttachment(attachment.orderItemId, attachment)
      } else {
        pushAttachment(-1, attachment)
      }
    })

    order.items.forEach((item) => {
      const collected = collectItemAttachments(item)
      collected.forEach((attachment) => pushAttachment(item.id, attachment))
    })

    Object.keys(map).forEach((key) => {
      const numericKey = Number(key)
      map[numericKey] = dedupeAttachments(map[numericKey])
    })

    return map
  }, [order, orderAttachments])

  const fallbackNamesByItem = useMemo(() => {
    if (!order) return {}
    const map: Record<number, string[]> = {}
    order.items.forEach((item) => {
      const names = collectAttachmentNameHints(item)
      if (names.length > 0) {
        map[item.id] = names
      }
    })
    return map
  }, [order])

  const attachmentsOverview = useMemo<ReactNode>(() => {
    if (!order) return null

    const sections: ReactNode[] = []

      order.items.forEach((item) => {
      const attachments = attachmentsByItem[item.id] || []
      const fallbackNames = fallbackNamesByItem[item.id] || []
      
      // جمع المرفقات من design_files و specifications مرة أخرى للتأكد
      const collectedAttachments = collectItemAttachments(item)
      const allAttachments = dedupeAttachments([...attachments, ...collectedAttachments])
      
      console.log(`📋 Processing item ${item.id} for attachments display:`, {
        attachments_count: attachments.length,
        collected_attachments_count: collectedAttachments.length,
        all_attachments_count: allAttachments.length,
        fallbackNames_count: fallbackNames.length,
        has_design_files: !!item.design_files,
        design_files_length: Array.isArray(item.design_files) ? item.design_files.length : 'N/A',
        design_files_preview: Array.isArray(item.design_files) && item.design_files.length > 0 ? item.design_files[0] : null,
        has_specifications: !!item.specifications,
        specifications_keys: item.specifications ? Object.keys(item.specifications) : [],
        specifications_preview: item.specifications ? JSON.stringify(item.specifications).substring(0, 200) : null
      })
      
      // عرض المرفقات حتى لو كانت فارغة، لإظهار البطاقة
      // لكن نتحقق من وجود بيانات فعلية قبل إضافة section
      const hasAnyData = allAttachments.length > 0 || fallbackNames.length > 0 || 
                        (item.design_files && (
                          (Array.isArray(item.design_files) && item.design_files.length > 0) ||
                          (typeof item.design_files === 'string' && item.design_files.trim().length > 0) ||
                          (typeof item.design_files === 'object' && item.design_files !== null)
                        )) ||
                        (item.specifications && typeof item.specifications === 'object' && Object.keys(item.specifications).length > 0)
      
      // إذا لم نجد مرفقات لكن design_files موجودة، حاول استخراجها مرة أخرى
      if (allAttachments.length === 0 && item.design_files) {
        console.log(`  🔄 No attachments found, re-attempting to extract from design_files:`, item.design_files)
        // محاولة إضافية لاستخراج الملفات
        try {
          let filesToExtract: any[] = []
          if (Array.isArray(item.design_files)) {
            filesToExtract = item.design_files
          } else if (typeof item.design_files === 'string') {
            try {
              const parsed = JSON.parse(item.design_files)
              filesToExtract = Array.isArray(parsed) ? parsed : [parsed]
            } catch {
              filesToExtract = [item.design_files]
            }
          } else if (typeof item.design_files === 'object') {
            filesToExtract = [item.design_files]
          }
          
          filesToExtract.forEach((fileEntry, idx) => {
            console.log(`    Re-extracting file[${idx}]:`, fileEntry)
            const normalized = normalizeAttachmentEntry(fileEntry, item.id, item.service_name || item.product_name)
            if (normalized && !allAttachments.find(a => a.url === normalized.url)) {
              allAttachments.push(normalized)
              console.log(`    ✅ Re-extracted attachment:`, normalized)
            }
          })
        } catch (e) {
          console.error(`    ❌ Error re-extracting files:`, e)
        }
      }
      
      if (!hasAnyData && allAttachments.length === 0) {
        console.log(`  ⚠️ No attachments found for item ${item.id}, skipping section`)
        return
      }
      
      // استخدام allAttachments بدلاً من attachments
      const finalAttachments = allAttachments.length > 0 ? allAttachments : attachments
      
      console.log(`  ✅ Final attachments for item ${item.id}:`, finalAttachments.length, finalAttachments.map(a => ({
        filename: a.filename,
        url: a.url.substring(0, 50),
        isImage: a.isImage
      })))

      const unmatchedFallbacks =
        finalAttachments.length > 0
          ? fallbackNames.filter(
              (name) => !finalAttachments.some((attachment) => attachment.filename === name)
            )
          : fallbackNames

      sections.push(
        <div key={`attachments-item-${item.id}`} className="attachments-item-group">
          <div className="attachments-item-header">
            <span className="attachments-item-title">{item.service_name || item.product_name || `عنصر ${item.id}`}</span>
            <span className="attachments-item-quantity">الكمية: {item.quantity}</span>
          </div>

          {finalAttachments.length > 0 ? (
            renderAttachmentsGrid(finalAttachments)
          ) : (
            <div className="attachments-missing">
              <p>لم يتم العثور على روابط مباشرة لتحميل الملفات لهذا العنصر حتى الآن.</p>
              {/* عرض معلومات debug - فقط في وضع التطوير */}
              {process.env.NODE_ENV === 'development' && (item.design_files || item.specifications) && (
                <div className="attachments-debug-info" style={{ marginTop: '12px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', fontSize: '12px', maxHeight: '300px', overflow: 'auto' }}>
                  <strong>معلومات Debug:</strong>
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>إظهار تفاصيل البيانات</summary>
                    <pre style={{ marginTop: '8px', overflow: 'auto', fontSize: '11px', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}>
                      {JSON.stringify({
                        item_id: item.id,
                        design_files: item.design_files,
                        design_files_type: typeof item.design_files,
                        design_files_is_array: Array.isArray(item.design_files),
                        design_files_length: Array.isArray(item.design_files) ? item.design_files.length : 'N/A',
                        specifications_keys: item.specifications ? Object.keys(item.specifications) : [],
                        specifications: item.specifications,
                        collected_attachments_count: collectedAttachments.length,
                        all_attachments_count: allAttachments.length,
                        final_attachments_count: finalAttachments.length
                      }, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {unmatchedFallbacks.length > 0 && (
            <div className="attachments-fallback">
              <span>أسماء ملفات بدون روابط:</span>
              <ul className="attachments-fallback-list">
                {unmatchedFallbacks.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    })

    const generalAttachments = attachmentsByItem[-1] || []
    if (generalAttachments.length > 0) {
      sections.push(
        <div key="attachments-general" className="attachments-item-group">
          <div className="attachments-item-header">
            <span className="attachments-item-title">مرفقات عامة</span>
          </div>
          {renderAttachmentsGrid(generalAttachments)}
        </div>
      )
    }

    if (sections.length === 0) {
      return (
        <div className="detail-card attachments-card">
          <div className="attachments-card-header">
            <h2>
              <Paperclip size={18} />
              <span>الملفات والمرفقات</span>
            </h2>
            {attachmentsLoading && <span className="attachments-loading">جاري تحميل المرفقات...</span>}
          </div>
          <p className="attachments-card-empty">
            {attachmentsLoading ? 'جاري تحميل المرفقات...' : 'لا توجد مرفقات متاحة لهذا الطلب بعد.'}
          </p>
        </div>
      )
    }

    return (
      <div className="detail-card attachments-card">
        <div className="attachments-card-header">
          <h2>
            <Paperclip size={18} />
            <span>الملفات والمرفقات</span>
          </h2>
          {attachmentsLoading && <span className="attachments-loading">جاري تحميل المرفقات...</span>}
        </div>
        <div className="attachments-groups">{sections}</div>
      </div>
    )
  }, [order, attachmentsByItem, attachmentsLoading, fallbackNamesByItem])

  if (loading) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="loading">جاري التحميل...</div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <div className="container">
          <div className="error-message">الطلب غير موجود</div>
        </div>
      </div>
    )
  }

  return (
    <div className="order-detail-page">
      <div className="container">
        <div className="order-detail-header">
          <button className="back-button" onClick={() => navigate('/dashboard/orders')}>
            <ArrowRight size={20} />
            العودة للطلبات
          </button>
          <div className="order-header-meta">
          <h1>تفاصيل الطلب: {order.order_number}</h1>
            <span className="order-status-chip">{getStatusLabel(order.status || 'pending')}</span>
          </div>
        </div>

        <div className="order-detail-content">
        {/* Customer Info Card */}
        <div className="detail-card customer-card">
          <h2>معلومات العميل</h2>
          <div className="customer-info-grid">
            <div className="info-item">
              <label>اسم العميل:</label>
              <span>{order.customer_name || '-'}</span>
            </div>
            <div className="info-item">
              <label>رقم الهاتف:</label>
              <span>{order.customer_phone || '-'}</span>
            </div>
            <div className="info-item">
              <label>واتساب:</label>
              <button 
                className="whatsapp-btn"
                onClick={() => openWhatsApp(order.customer_whatsapp || order.customer_phone)}
              >
                <MessageSquare size={16} />
                {order.customer_whatsapp || order.customer_phone}
              </button>
            </div>
            {order.customer_whatsapp && order.customer_whatsapp !== order.customer_phone && (
              <div className="info-item">
                <label>واتساب إضافي:</label>
                <button 
                  className="whatsapp-btn"
                  onClick={() => openWhatsApp(order.customer_whatsapp)}
                >
                  <MessageSquare size={16} />
                  {order.customer_whatsapp}
                </button>
              </div>
            )}
            {order.shop_name && (
              <div className="info-item">
                <label>اسم المتجر:</label>
                <span>{order.shop_name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivery Address Card - دائماً نعرضها */}
        <div className="detail-card delivery-address-card">
          <h2>
            <MapPin size={20} />
            {order.delivery_type === 'delivery' ? 'عنوان التوصيل' : 'عنوان العميل'}
          </h2>
          <div className="delivery-address-content">
            {/* عرض جميع بيانات العنوان */}
            {order.delivery_address || order.delivery_address_details || order.delivery_address_data || (order.delivery_latitude && order.delivery_longitude) ? (
              <div className="delivery-address-info">
                {/* بيانات العنوان الكاملة من delivery_address_data */}
                {order.delivery_address_data && (
                  <>
                    {order.delivery_address_data.street && (
                      <div className="address-field">
                        <label>اسم الشارع:</label>
                        <p>{order.delivery_address_data.street}</p>
                      </div>
                    )}
                    {order.delivery_address_data.neighborhood && (
                      <div className="address-field">
                        <label>الحي:</label>
                        <p>{order.delivery_address_data.neighborhood}</p>
                      </div>
                    )}
                    {order.delivery_address_data.building && (
                      <div className="address-field">
                        <label>البناء:</label>
                        <p>{order.delivery_address_data.building}</p>
                      </div>
                    )}
                    {order.delivery_address_data.floor && (
                      <div className="address-field">
                        <label>الطابق:</label>
                        <p>{order.delivery_address_data.floor}</p>
                      </div>
                    )}
                    {order.delivery_address_data.apartment && (
                      <div className="address-field">
                        <label>رقم الشقة:</label>
                        <p>{order.delivery_address_data.apartment}</p>
                      </div>
                    )}
                    {order.delivery_address_data.description && (
                      <div className="address-field">
                        <label>وصف إضافي:</label>
                        <p>{order.delivery_address_data.description}</p>
                      </div>
                    )}
                    {order.delivery_address_data.formattedAddress && (
                      <div className="address-field">
                        <label>العنوان الكامل:</label>
                        <p>{order.delivery_address_data.formattedAddress}</p>
                      </div>
                    )}
                  </>
                )}

                {/* العنوان الأساسي - إذا لم تكن هناك بيانات مفصلة */}
                {!order.delivery_address_data && order.delivery_address && (
                  <div className="address-field">
                    <label>العنوان:</label>
                    <p>{order.delivery_address}</p>
                  </div>
                )}

                {/* البيانات الإضافية */}
                {order.delivery_address_details && (
                  <div className="address-field">
                    <label>تفاصيل إضافية:</label>
                    <p>{order.delivery_address_details}</p>
                  </div>
                )}

                {/* صور إضافية للعنوان */}
                {order.delivery_address_data?.images && Array.isArray(order.delivery_address_data.images) && order.delivery_address_data.images.length > 0 && (
                  <div className="address-field">
                    <label>صور إضافية للعنوان:</label>
                    <div className="address-images-grid">
                      {order.delivery_address_data.images.map((imageUrl: string, idx: number) => (
                        <div key={idx} className="address-image-item">
                          <img 
                            src={imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${PUBLIC_BASE_URL}${imageUrl}`} 
                            alt={`صورة العنوان ${idx + 1}`}
                            onClick={() => window.open(imageUrl.startsWith('http') || imageUrl.startsWith('data:') ? imageUrl : `${PUBLIC_BASE_URL}${imageUrl}`, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* الإحداثيات */}
                {order.delivery_latitude && order.delivery_longitude && (
                  <div className="address-field">
                    <label>الإحداثيات:</label>
                    <span className="coordinates">{order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}</span>
                  </div>
                )}

                {/* زر واحد لتحديد الموقع في GPS */}
                {(order.delivery_latitude && order.delivery_longitude) || order.delivery_address || order.delivery_address_data ? (
                  <div className="delivery-actions-single">
                    <button
                      className="delivery-action-btn gps-btn"
                      onClick={() => {
                        if (order.delivery_latitude && order.delivery_longitude) {
                          // افتح Google Maps في GPS مع الاتجاهات
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_latitude},${order.delivery_longitude}&travelmode=driving`, '_blank')
                        } else {
                          // إذا لم تكن هناك إحداثيات، افتح Google Maps للبحث
                          const addressText = order.delivery_address_data?.formattedAddress || 
                                           order.delivery_address_data?.street || 
                                           order.delivery_address || 
                                           ''
                          const address = encodeURIComponent(addressText)
                          window.open(`https://www.google.com/maps/search/?api=1&query=${address}`, '_blank')
                        }
                      }}
                    >
                      <Navigation size={18} />
                      تحديد الموقع في GPS
                    </button>
                  </div>
                ) : null}

                {/* الخريطة - عرض تلقائي إذا كانت هناك إحداثيات */}
                {order.delivery_latitude && order.delivery_longitude && (
                  <div className="delivery-map-container">
                    <SimpleMap
                      address={order.delivery_address || order.delivery_address_data?.formattedAddress || order.delivery_address_data?.street}
                      latitude={order.delivery_latitude}
                      longitude={order.delivery_longitude}
                      defaultCenter={[order.delivery_latitude, order.delivery_longitude]}
                      defaultZoom={17}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="delivery-address-empty">
                <p>لا يوجد عنوان مسجل</p>
              </div>
            )}
          </div>
        </div>

          {attachmentsOverview}

        {/* Order Items */}
        <div className="detail-card items-card">
          <h2>عناصر الطلب</h2>
          {order.order_type && (
            <div className="order-type-badge-container">
              <span className={`order-type-badge ${order.order_type}`}>
                {order.order_type === 'service' ? '🛠️ طلب خدمة' : '📦 طلب منتج'}
              </span>
              {order.total_quantity && order.total_quantity > 0 && (
                <span className="total-quantity-badge">
                  الكمية الإجمالية: {order.total_quantity}
                </span>
              )}
            </div>
          )}
          <div className="items-list">
              {order.items.map((item) => {
                const specs = item.specifications || {}
                const genericSpecEntries = buildGenericSpecEntries(specs)
                return (
              <div key={item.id} className="order-item-card">
                <div className="item-header">
                  <div className="item-name-section">
                    <h3>{item.service_name || item.product_name}</h3>
                    {item.order_type && (
                      <span className={`item-type-badge ${item.order_type}`}>
                        {item.order_type === 'service' ? '🛠️ خدمة' : '📦 منتج'}
                      </span>
                    )}
                  </div>
                  <span className="item-quantity">الكمية: {item.quantity}</span>
                </div>
                <div className="item-details">
                  <div className="item-price">
                    <span>السعر للوحدة: {item.unit_price.toLocaleString()} ل.س</span>
                    <span className="total">الإجمالي: {item.total_price.toLocaleString()} ل.س</span>
                  </div>
                  {item.specifications && (
                    <div className="item-specs">
                          {specs.dimensions && (
                        <div className="spec-group dimensions-group">
                          <label>الأبعاد:</label>
                          <div className="dimensions-details">
                                {specs.dimensions.length && (
                              <div className="dimension-item">
                                <span className="dimension-label">الطول:</span>
                                <span className="dimension-value">
                                      {specs.dimensions.length} {specs.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                                {specs.dimensions.width && (
                              <div className="dimension-item">
                                <span className="dimension-label">العرض:</span>
                                <span className="dimension-value">
                                      {specs.dimensions.width} {specs.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                                {specs.dimensions.height && (
                              <div className="dimension-item">
                                <span className="dimension-label">الارتفاع:</span>
                                <span className="dimension-value">
                                      {specs.dimensions.height} {specs.dimensions.unit || 'سم'}
                                </span>
                              </div>
                            )}
                                {specs.dimensions.unit && (
                              <div className="dimension-item">
                                <span className="dimension-label">وحدة القياس:</span>
                                    <span className="dimension-value">{specs.dimensions.unit}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                          {Array.isArray(specs.colors) && specs.colors.length > 0 && (
                        <div className="spec-group">
                          <label>الألوان:</label>
                          <div className="colors-list">
                                {specs.colors.map((color: string, idx: number) => (
                                  <span key={idx} className="color-dot" style={{ backgroundColor: color }} title={color} />
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(specs.selected_colors) && specs.selected_colors.length > 0 && (
                            <div className="spec-group">
                              <label>الألوان المختارة:</label>
                              <div className="colors-list">
                                {specs.selected_colors.map((color: string, idx: number) => (
                                  <span key={idx} className="color-dot" style={{ backgroundColor: color }} title={color} />
                                ))}
                              </div>
                            </div>
                          )}
                          {Array.isArray(specs.auto_colors) && specs.auto_colors.length > 0 && (
                            <div className="spec-group">
                              <label>ألوان مقترحة:</label>
                              <div className="colors-list">
                                {specs.auto_colors.map((color: string, idx: number) => (
                                  <span key={idx} className="color-dot" style={{ backgroundColor: color }} title={color} />
                            ))}
                          </div>
                        </div>
                      )}
                          {specs.work_type && (
                        <div className="spec-group">
                          <label>نوع العمل:</label>
                              <span>{specs.work_type}</span>
                        </div>
                      )}
                          {specs.print_color && (
                        <div className="spec-group">
                          <label>نوع الطباعة:</label>
                              <span>{specs.print_color === 'color' ? 'ملون' : 'أبيض وأسود'}</span>
                            </div>
                          )}
                          {specs.print_quality && (
                            <div className="spec-group">
                              <label>جودة الطباعة:</label>
                              <span>{specs.print_quality}</span>
                        </div>
                      )}
                          {specs.print_sides && (
                        <div className="spec-group">
                          <label>الوجهين:</label>
                              <span>{specs.print_sides === 'double' ? 'وجهين' : 'وجه واحد'}</span>
                            </div>
                          )}
                          {specs.number_of_pages && (
                            <div className="spec-group">
                              <label>عدد الصفحات:</label>
                              <span>{specs.number_of_pages}</span>
                        </div>
                      )}
                          {specs.total_pages && !specs.number_of_pages && (
                        <div className="spec-group">
                          <label>عدد الصفحات:</label>
                              <span>{specs.total_pages}</span>
                        </div>
                      )}
                          {specs.paper_size && (
                        <div className="spec-group">
                          <label>حجم الورق:</label>
                              <span>{specs.paper_size}</span>
                        </div>
                      )}
                          {specs.delivery_type && (
                        <div className="spec-group">
                          <label>نوع التوصيل:</label>
                              <span>{specs.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                        </div>
                      )}
                          {specs.notes && (
                        <div className="spec-group">
                          <label>ملاحظات:</label>
                              <span>{specs.notes}</span>
                            </div>
                          )}
                          {genericSpecEntries.length > 0 && (
                            <div className="spec-group-list">
                              {genericSpecEntries.map(([key, value]) => (
                                <div key={key} className="spec-group spec-group--generic">
                                  <label>{translateSpecKey(key)}:</label>
                                  <div className="spec-value">{renderSpecValue(value)}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                      </div>
                )
              })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="detail-card summary-card">
          <h2>ملخص الطلب</h2>
          <div className="summary-grid">
            <div className="summary-item">
              <label>تاريخ الطلب:</label>
              <span>{new Date(order.created_at).toLocaleDateString('ar-SY', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div className="summary-item">
              <label>نوع التوصيل:</label>
              <div className="delivery-info-wrapper">
                <span>{order.delivery_type === 'delivery' ? 'توصيل' : 'استلام ذاتي'}</span>
                {order.delivery_type === 'delivery' && (order.delivery_latitude && order.delivery_longitude) && (
                  <button
                    className="show-location-btn"
                    onClick={() => setShowLocationMap(!showLocationMap)}
                  >
                    <MapPin size={16} />
                    {showLocationMap ? 'إخفاء الخريطة' : 'عرض الموقع على الخريطة'}
                  </button>
                )}
              </div>
            </div>
            {order.delivery_type === 'delivery' && (
              <>
                {order.delivery_address && (
                  <div className="summary-item">
                    <label>عنوان التوصيل:</label>
                    <span>{order.delivery_address}</span>
                  </div>
                )}
                {order.delivery_latitude && order.delivery_longitude && (
                  <>
                    <div className="summary-item">
                      <label>الإحداثيات:</label>
                      <span>{order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}</span>
                    </div>
                    <div className="summary-item">
                      <label>رابط الخريطة:</label>
                      <a 
                        href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="map-link"
                      >
                        <MapPin size={16} />
                        فتح في Google Maps
                      </a>
                    </div>
                    <div className="summary-item">
                      <button
                        className="show-location-btn"
                        onClick={() => setShowLocationMap(!showLocationMap)}
                      >
                        <MapPin size={16} />
                        {showLocationMap ? 'إخفاء الخريطة' : 'عرض الموقع على الخريطة'}
                      </button>
                    </div>
                    {showLocationMap && (
                      <div className="summary-item location-map-item">
                        <label>الموقع على الخريطة:</label>
                        <div className="location-map-container">
                          <SimpleMap
                            address={order.delivery_address}
                            latitude={order.delivery_latitude}
                            longitude={order.delivery_longitude}
                            defaultCenter={[order.delivery_latitude, order.delivery_longitude]}
                            defaultZoom={17}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            <div className="summary-item">
              <label>حالة الدفع:</label>
              <span>{order.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span>
            </div>
            <div className="summary-item total">
              <label>الإجمالي:</label>
              <span className="amount">{order.final_amount.toLocaleString()} ل.س</span>
            </div>
          </div>
          {order.notes && (
            <div className="customer-notes">
              <label>ملاحظات العميل:</label>
              <p>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Staff Notes */}
        <div className="detail-card notes-card">
          <h2>ملاحظات الموظف</h2>
          <textarea
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
            placeholder="أضف ملاحظات حول هذا الطلب..."
            className="notes-textarea"
            rows={4}
          />
          <button
            className="save-notes-btn"
            onClick={handleSaveNotes}
            disabled={isSavingNotes}
          >
            <Save size={16} />
            {isSavingNotes ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

