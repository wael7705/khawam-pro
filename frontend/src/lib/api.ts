import axios, { AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 0, // لا timeout - لإلغاء timeout بسبب رداءة الإنترنت
})

  // Add request interceptor to include auth token - مع دعم Token مخصص
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
    
    // تنظيف token غير صالح (فقط إذا كانت القيمة حرفياً 'null' أو 'undefined' كسلسلة)
    if (token === 'null' || token === 'undefined') {
      console.warn('⚠️ Invalid token string found in interceptor, removing it:', token)
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      return config
    }
    
    // إضافة token إذا كان موجوداً (حتى لو كان قصيراً - قد يكون token مخصص مثل admin_token_1)
    if (token && token.trim() !== '') {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Add response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    // Retry logic for network errors
    if (
      error.code === 'ERR_NETWORK' ||
      error.code === 'ERR_NETWORK_CHANGED' ||
      error.code === 'ERR_CONNECTION_RESET' ||
      error.message?.includes('Network Error') ||
      error.message?.includes('ERR_NETWORK')
    ) {
      // Retry up to 3 times
      if (!originalRequest._retry && originalRequest._retryCount < 3) {
        originalRequest._retry = true
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount))

        return api(originalRequest)
      }
    }

    // Handle 401 errors (unauthorized) - لكن لا نحذف token تلقائياً
    // لأن هذا قد يسبب مشاكل عندما يكون المستخدم مسجل دخول بالفعل
    // دع component يتعامل مع 401 errors
    if (error.response?.status === 401) {
      // لا نحذف token تلقائياً - قد يكون المستخدم مسجل دخول
      // فقط نترك component يتعامل مع الخطأ
      console.warn('401 Unauthorized - Token may be invalid or expired')
    }

    return Promise.reject(error)
  }
)

// Services API
export const servicesAPI = {
  getAll: async () => {
    const response = await api.get('/services/')
    return { data: Array.isArray(response.data) ? response.data : [] }
  },
}

// Hero Slides API
export const heroSlidesAPI = {
  getAll: (is_active?: boolean) => {
    const params = is_active !== undefined ? { is_active } : {}
    // إضافة timestamp لمنع cache من المتصفح
    params['_t'] = Date.now()
    return api.get('/hero-slides', { 
      params,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  },
  create: (data: { image_url: string; is_logo?: boolean; is_active?: boolean; display_order?: number }) =>
    api.post('/hero-slides', data),
  update: (id: number, data: { image_url?: string; is_logo?: boolean; is_active?: boolean; display_order?: number }) =>
    api.put(`/hero-slides/${id}`, data),
  delete: (id: number) => api.delete(`/hero-slides/${id}`),
  reorder: (slide_orders: Array<{ id: number; display_order: number }>) =>
    api.post('/hero-slides/reorder', slide_orders),
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/hero-slides/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

export const portfolioAPI = {
    getAll: async () => {
      const response = await api.get('/portfolio/')
      return { data: Array.isArray(response.data) ? response.data : [] }
    },
    getFeatured: async () => {
      const response = await api.get('/portfolio/featured')
      return { data: Array.isArray(response.data) ? response.data : [] }
    },
    getById: async (id: number) => {
      const response = await api.get(`/portfolio/${id}`)
      return { data: response.data }
    },
  }

// Orders API
export const ordersAPI = {
  getAll: (myOrders: boolean = true) => api.get('/orders/', { params: { my_orders: myOrders } }),  // my_orders=true للفلترة بناءً على customer_id
  create: (data: any) => api.post('/orders/', data),
  getAttachments: (orderId: number) => api.get(`/orders/${orderId}/attachments`),
  getFile: (orderId: number, fileKey: string) =>
    api.get(`/orders/${orderId}/attachments/${encodeURIComponent(fileKey)}`, {
      responseType: 'blob',
    }),
}

// Studio API
export const studioAPI = {
  removeBackground: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/studio/remove-background', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  createPassportPhotos: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/studio/passport-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  cropRotate: async (file: File, angle: number = 0, cropParams?: { x: number; y: number; width: number; height: number }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('angle', angle.toString())
    if (cropParams) {
      formData.append('x', cropParams.x.toString())
      formData.append('y', cropParams.y.toString())
      formData.append('width', cropParams.width.toString())
      formData.append('height', cropParams.height.toString())
    }
    const response = await api.post('/studio/crop-rotate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  applyFilter: async (file: File, brightness: number = 100, contrast: number = 100, saturation: number = 100) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('brightness', brightness.toString())
    formData.append('contrast', contrast.toString())
    formData.append('saturation', saturation.toString())
    const response = await api.post('/studio/apply-filter', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

// Auth API
export const authAPI = {
  login: (username: string, password: string) => api.post('/auth/login', { username, password }),
  register: (data: any) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: { current_password: string; new_password: string }) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
}

// Admin API
export const adminAPI = {
  // Products
  products: {
    getAll: () => api.get('/admin/products/all'),
    create: (data: any) => api.post('/admin/products', data),
    update: (id: number, data: any) => api.put(`/admin/products/${id}`, data),
    delete: (id: number) => api.delete(`/admin/products/${id}`),
  },
  
  // Services
  services: {
    getAll: () => api.get('/admin/services/all'),
    create: (data: any) => api.post('/admin/services', data),
    update: (id: number, data: any) => api.put(`/admin/services/${id}`, data),
    delete: (id: number) => api.delete(`/admin/services/${id}`),
    cleanupDuplicates: () => api.post('/admin/services/cleanup-duplicates'),
  },
  
  // Portfolio Works
  works: {
    getAll: () => api.get('/admin/works/all'),
    create: (data: any) => api.post('/admin/works', data),
    update: (id: number, data: any) => api.put(`/admin/works/${id}`, data),
    delete: (id: number) => api.delete(`/admin/works/${id}`),
  },
  
  // Orders
  orders: {
    getAll: () => api.get('/admin/orders/all'),
    getById: (id: number) => api.get(`/admin/orders/${id}`),
    updateStatus: (id: number, status: string, cancellationReason?: string, rejectionReason?: string) => api.put(`/admin/orders/${id}/status`, {
      status,
      cancellation_reason: cancellationReason,
      rejection_reason: rejectionReason
    }),
    updateStaffNotes: (id: number, notes: string) => api.put(`/admin/orders/${id}/staff-notes`, { notes }),
    updateRating: (id: number, rating: number, ratingComment?: string) => api.put(`/admin/orders/${id}/rating`, { 
      rating, 
      rating_comment: ratingComment 
    }),
    delete: (id: number) => api.delete(`/admin/orders/${id}`),
    deleteByStatus: (status: string) => api.delete(`/admin/orders/bulk/delete-by-status?status=${status}`),
    // Archive
    archive: {
      getDaily: (date?: string) => api.get(`/admin/orders/archive/daily${date ? `?archive_date=${date}` : ''}`),
      getMonthly: (year: number, month: number) => api.get(`/admin/orders/archive/monthly?year=${year}&month=${month}`),
      getDates: () => api.get('/admin/orders/archive/dates'),
      moveDaily: () => api.post('/admin/orders/archive/daily-move'),
      moveMonthly: () => api.post('/admin/orders/archive/monthly-move'),
    },
  },
  
  // Dashboard Statistics
  dashboard: {
    getStats: () => api.get('/admin/dashboard/stats'),
    getPerformanceStats: () => api.get('/admin/dashboard/performance-stats'),
    getTopProducts: () => api.get('/admin/dashboard/top-products'),
    getTopServices: () => api.get('/admin/dashboard/top-services'),
    getSalesOverview: (period: string = 'month') => api.get(`/admin/dashboard/sales-overview?period=${period}`),
    getRecentOrders: (limit: number = 10) => api.get(`/admin/dashboard/recent-orders?limit=${limit}`),
  },
  
  // Customers
  customers: {
    getAll: () => api.get('/admin/customers'),
    getByPhone: (phone: string) => api.get(`/admin/customers/${encodeURIComponent(phone)}`),
    updateNotes: (phone: string, notes: string) => api.put(`/admin/customers/${encodeURIComponent(phone)}/notes`, { notes }),
  },
  
  // Upload
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
  
  // Payments
  payments: {
    getSettings: () => api.get('/admin/payment-settings'),
    createSettings: (data: any) => api.post('/admin/payment-settings', data),
    updateSettings: (id: number, data: any) => api.put(`/admin/payment-settings/${id}`, data),
  },
}

// Pricing API
export const pricingAPI = {
  getAll: (params?: { is_active?: boolean; calculation_type?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    if (params?.calculation_type) queryParams.append('calculation_type', params.calculation_type)
    return api.get(`/pricing-rules?${queryParams.toString()}`)
  },
  getById: (id: number) => api.get(`/pricing-rules/${id}`),
  create: (data: any) => api.post('/pricing-rules', data),
  update: (id: number, data: any) => api.put(`/pricing-rules/${id}`, data),
  delete: (id: number) => api.delete(`/pricing-rules/${id}`),
  calculatePrice: (data: { calculation_type: string; quantity: number; specifications: any }) =>
    api.post('/calculate-price', data),
  calculatePriceByRule: (ruleId: number, data: { quantity: number; specifications: any }) =>
    api.post(`/calculate-price-by-rule/${ruleId}`, data),
  // Advanced pricing
  getAdvancedRules: (params?: { calculation_type?: string; print_type?: string; paper_size?: string; is_active?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.calculation_type) queryParams.append('calculation_type', params.calculation_type)
    if (params?.print_type) queryParams.append('print_type', params.print_type)
    if (params?.paper_size) queryParams.append('paper_size', params.paper_size)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    return api.get(`/advanced-pricing-rules?${queryParams.toString()}`)
  },
  createAdvancedRule: (data: any) => api.post('/advanced-pricing-rules', data),
  calculateAdvancedPrice: (params: {
    calculation_type: string
    quantity: number
    width_cm?: number
    height_cm?: number
    print_type?: string
    quality_type?: string
    paper_type?: string
  }) => {
    const queryParams = new URLSearchParams()
    queryParams.append('calculation_type', params.calculation_type)
    queryParams.append('quantity', params.quantity.toString())
    if (params.width_cm) queryParams.append('width_cm', params.width_cm.toString())
    if (params.height_cm) queryParams.append('height_cm', params.height_cm.toString())
    if (params.print_type) queryParams.append('print_type', params.print_type)
    if (params.quality_type) queryParams.append('quality_type', params.quality_type)
    if (params.paper_type) queryParams.append('paper_type', params.paper_type)
    return api.get(`/calculate-price-advanced?${queryParams.toString()}`)
  },
  bulkUpdatePrices: (data: { percentage: number; operation: 'increase' | 'decrease'; filter_criteria?: any }) =>
    api.post('/bulk-update-prices', data),
}

export const pricingHierarchicalAPI = {
  getCategories: () => api.get('/pricing-hierarchical/categories'),
  createCategory: (data: any) => api.post('/pricing-hierarchical/categories', data),
  getConfigs: (params?: { category_id?: number; paper_size?: string }) => {
    const queryParams = new URLSearchParams()
    if (params?.category_id) queryParams.append('category_id', params.category_id.toString())
    if (params?.paper_size) queryParams.append('paper_size', params.paper_size)
    return api.get(`/pricing-hierarchical/configs?${queryParams.toString()}`)
  },
  createConfig: (data: any) => api.post('/pricing-hierarchical/configs', data),
  deleteConfig: (id: number) => api.delete(`/pricing-hierarchical/configs/${id}`),
  calculatePrice: (data: {
    category_id: number
    paper_size: string
    paper_type?: string
    print_type: string
    quality_type?: string
    quantity: number
  }) => api.post('/pricing-hierarchical/calculate-price', data),
}

// Service Workflows API
export const workflowsAPI = {
  getServiceWorkflow: (serviceId: number) => api.get(`/workflows/service/${serviceId}/workflow`),
  setupLecturePrinting: () => api.post('/workflows/setup-lecture-printing'),
  setupFlexPrinting: () => api.post('/workflows/setup-flex-printing'),
  getWorkflow: (workflowId: number) => api.get(`/workflows/workflow/${workflowId}`),
  createWorkflow: (data: any) => api.post('/workflows/workflow', data),
  updateWorkflow: (workflowId: number, data: any) => api.put(`/workflows/workflow/${workflowId}`, data),
  deleteWorkflow: (workflowId: number) => api.delete(`/workflows/workflow/${workflowId}`),
}

// File Analysis API
export const fileAnalysisAPI = {
  analyzeFiles: (files: File[]) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    return api.post('/files/analyze-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
}

export default api
