import { useState, useEffect, useMemo, type ReactNode, type CSSProperties } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, MessageSquare, Save, MapPin, ExternalLink, Download, FileText, Paperclip } from 'lucide-react'
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
      const result = {
        url: trimmed, // استخدم data URL مباشرة
        filename: extractFileName(trimmed) || 'ملف',
        isImage: looksLikeImage(trimmed) || trimmed.startsWith('data:image/'),
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
    console.log('🔍 Processing object entry:', Object.keys(entry))
    const rawUrl =
      entry.url ||
      entry.file_url ||
      entry.file ||
      entry.path ||
      entry.href ||
      entry.location_url ||
      entry.download_url ||
      entry.raw_path ||
      entry.data_url || // إضافة دعم data_url
      entry.data || // إضافة دعم data
      ''
    const rawUrlString = String(rawUrl).trim()
    console.log('🔍 Raw URL string:', rawUrlString.substring(0, 100))
    let url = ''
    
    // إذا كانت data URL، استخدمها مباشرة
    if (rawUrlString && isDataUrl(rawUrlString)) {
      console.log('✅ Found data URL in object:', rawUrlString.substring(0, 50) + '...')
      url = rawUrlString
    } else if (rawUrlString && !rawUrlString.startsWith(':')) {
      url = resolveToAbsoluteUrl(rawUrlString)
      console.log('✅ Resolved URL from object:', url)
    }

    if (!url && entry.location) {
      const locationUrl = String(entry.location).trim()
      console.log('🔍 Trying location URL:', locationUrl.substring(0, 50))
      if (isDataUrl(locationUrl)) {
        url = locationUrl
        console.log('✅ Found data URL in location')
      } else {
        url = resolveToAbsoluteUrl(locationUrl)
        console.log('✅ Resolved location URL:', url)
      }
    }

    // إذا لم نجد URL بعد، قد يكون entry نفسه هو data URL ككائن
    if (!url && typeof entry === 'object' && entry.toString) {
      const entryString = entry.toString()
      if (entryString && isDataUrl(entryString)) {
        url = entryString
        console.log('✅ Found data URL in entry.toString()')
      }
    }

    if (!url) {
      console.warn('⚠️ No URL found in object entry:', entry)
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
      console.log('✅ Detected image from data URL MIME type')
    } else {
      isImage = mimeType.includes('image') || looksLikeImage(url) || looksLikeImage(filename)
      console.log('✅ Detected image from:', { mimeType, url, filename, isImage })
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
  return (
    <div className="attachments-grid">
      {files.map((file) => {
        const locationLabel = file.location || file.originLabel
        return (
          <div key={`${file.url}-${file.filename}`} className="attachment-card">
            <div className={`attachment-preview ${file.isImage ? 'image' : 'document'}`}>
              {file.isImage ? (
                <img src={file.url} alt={file.filename} loading="lazy" />
              ) : (
                <FileText size={26} />
              )}
            </div>
            <div className="attachment-meta">
              {locationLabel && <span className="attachment-location">{locationLabel}</span>}
              <span className="attachment-name">{file.filename}</span>
              {file.sizeLabel && <span className="attachment-size">{file.sizeLabel}</span>}
              <div className="attachment-actions">
                <button
                  className="attachment-action"
                  type="button"
                  onClick={() => window.open(file.url, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink size={16} />
                  عرض
                </button>
                <button
                  className="attachment-action"
                  type="button"
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = file.url
                    link.download = file.filename || 'attachment'
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
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
  if (!specs || typeof specs !== 'object') return []
  const entries: any[] = []

  console.log('🔍 collectAttachmentsFromSpecs - specs keys:', Object.keys(specs))

  ATTACHMENT_SPEC_KEYS.forEach((key) => {
    const value = specs[key]
    if (!value) return
    console.log(`  Checking key "${key}":`, value, Array.isArray(value))
    if (Array.isArray(value)) {
      entries.push(...value)
      console.log(`  ✅ Added ${value.length} entries from ${key}`)
    } else {
      entries.push(value)
      console.log(`  ✅ Added 1 entry from ${key}`)
    }
  })
  
  // أيضاً ابحث في جميع المفاتيح التي قد تحتوي على ملفات
  Object.keys(specs).forEach((key) => {
    const value = specs[key]
    if (!value) return
    
    // إذا كان المفتاح يحتوي على "file" أو "image" أو "design" أو "upload"
    const keyLower = key.toLowerCase()
    if ((keyLower.includes('file') || keyLower.includes('image') || keyLower.includes('design') || keyLower.includes('upload') || keyLower.includes('attachment')) 
        && !ATTACHMENT_SPEC_KEYS.includes(key)) {
      console.log(`  🔍 Found potential attachment key "${key}":`, value)
      if (Array.isArray(value)) {
        value.forEach(item => {
          if (item && (typeof item === 'string' || typeof item === 'object')) {
            entries.push(item)
          }
        })
      } else if (typeof value === 'string' || typeof value === 'object') {
        entries.push(value)
      }
    }
  })

  console.log(`✅ Total entries collected from specs: ${entries.length}`)
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
  
  if (Array.isArray(item.design_files)) {
    console.log(`✅ Found ${item.design_files.length} design_files in array`)
    item.design_files.forEach((entry, idx) => {
      console.log(`  Processing design_file[${idx}]:`, entry, typeof entry)
      const normalized = normalizeAttachmentEntry(entry, item.id, item.service_name || item.product_name)
      if (normalized) {
        console.log(`  ✅ Normalized attachment:`, normalized)
        entries.push(normalized)
      } else {
        console.warn(`  ⚠️ Failed to normalize entry:`, entry)
      }
    })
  } else if (item.design_files) {
    console.log('⚠️ design_files is not an array:', item.design_files, typeof item.design_files)
    // محاولة تحويل إلى array
    try {
      const filesArray = Array.isArray(item.design_files) ? item.design_files : [item.design_files]
      filesArray.forEach((entry, idx) => {
        const normalized = normalizeAttachmentEntry(entry, item.id, item.service_name || item.product_name)
        if (normalized) {
          entries.push(normalized)
        }
      })
    } catch (e) {
      console.error('Error processing design_files:', e)
    }
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

  useEffect(() => {
    if (id) {
      loadOrder(parseInt(id, 10))
    }
  }, [id])

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
        
        // Log design_files for each item
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((item: any, idx: number) => {
            console.log(`📎 Item[${idx}] design_files:`, {
              item_id: item.id,
              design_files: item.design_files,
              design_files_type: typeof item.design_files,
              design_files_is_array: Array.isArray(item.design_files),
              design_files_length: Array.isArray(item.design_files) ? item.design_files.length : 'N/A'
            })
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
      
      console.log(`📋 Processing item ${item.id} for attachments display:`, {
        attachments_count: attachments.length,
        fallbackNames_count: fallbackNames.length,
        has_design_files: !!item.design_files,
        design_files_length: Array.isArray(item.design_files) ? item.design_files.length : 'N/A',
        has_specifications: !!item.specifications,
        specifications_keys: item.specifications ? Object.keys(item.specifications) : []
      })
      
      // عرض المرفقات حتى لو كانت فارغة، لإظهار البطاقة
      // لكن نتحقق من وجود بيانات فعلية قبل إضافة section
      const hasAnyData = attachments.length > 0 || fallbackNames.length > 0
      if (!hasAnyData) {
        console.log(`  ⚠️ No attachments found for item ${item.id}, skipping section`)
        return
      }

      const unmatchedFallbacks =
        attachments.length > 0
          ? fallbackNames.filter(
              (name) => !attachments.some((attachment) => attachment.filename === name)
            )
          : fallbackNames

      sections.push(
        <div key={`attachments-item-${item.id}`} className="attachments-item-group">
          <div className="attachments-item-header">
            <span className="attachments-item-title">{item.service_name || item.product_name || `عنصر ${item.id}`}</span>
            <span className="attachments-item-quantity">الكمية: {item.quantity}</span>
          </div>

          {attachments.length > 0 ? (
            renderAttachmentsGrid(attachments)
          ) : (
            <p className="attachments-missing">
              لم يتم العثور على روابط مباشرة لتحميل الملفات لهذا العنصر حتى الآن.
            </p>
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

        {/* Status Card - دائماً نعرضه */}
        <div className="detail-card status-card">
          <h2>حالة الطلب</h2>
          <div className="status-controls">
            <div className="current-status">
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(order.status || 'pending') }}
              >
                {getStatusLabel(order.status || 'pending')}
              </span>
            </div>
            <div className="status-buttons">
              {STATUS_OPTIONS.map((option) => {
                const style = { '--status-color': option.color } as CSSProperties
                const isCurrent = option.id === (order.status || 'pending')
                return (
                  <button
                    key={option.id}
                    className={`status-btn ${isCurrent ? 'active' : ''}`}
                    style={style}
                    onClick={() => handleStatusChange(option.id)}
                    disabled={isUpdatingStatus || isCurrent}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Delivery Address Card - عند اختيار التوصيل */}
        {order.delivery_type === 'delivery' && (order.delivery_address || (order.delivery_latitude && order.delivery_longitude)) && (
          <div className="detail-card delivery-address-card">
            <h2>
              <MapPin size={20} />
              عنوان التوصيل
            </h2>
            <div className="delivery-address-content">
              {order.delivery_address && (
                <div className="delivery-address-text">
                  <label>العنوان:</label>
                  <p>{order.delivery_address}</p>
                </div>
              )}
              {order.delivery_latitude && order.delivery_longitude && (
                <>
                  <div className="delivery-coordinates">
                    <label>الإحداثيات:</label>
                    <span>{order.delivery_latitude.toFixed(6)}, {order.delivery_longitude.toFixed(6)}</span>
                  </div>
                  <div className="delivery-map-actions">
                    <button
                      className="map-action-btn"
                      onClick={() => setShowLocationMap(!showLocationMap)}
                    >
                      <MapPin size={16} />
                      {showLocationMap ? 'إخفاء الخريطة' : 'عرض على الخريطة'}
                    </button>
                    <a
                      href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="map-action-btn external"
                    >
                      <ExternalLink size={16} />
                      فتح في Google Maps
                    </a>
                  </div>
                  {showLocationMap && (
                    <div className="delivery-map-container">
                      <SimpleMap
                        address={order.delivery_address}
                        latitude={order.delivery_latitude}
                        longitude={order.delivery_longitude}
                        defaultCenter={[order.delivery_latitude, order.delivery_longitude]}
                        defaultZoom={17}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

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

