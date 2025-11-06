import axios, { AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds timeout
})

// Add request interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
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

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_data')
      // Don't redirect on API errors, let the component handle it
    }

    return Promise.reject(error)
  }
)

// Products API
export const productsAPI = {
  getAll: async () => {
    const response = await api.get('/products/')
    return { data: Array.isArray(response.data) ? response.data : (response.data.products || []) }
  },
  getById: (id: number) => api.get(`/products/${id}`),
  getFeatured: async () => {
    const response = await api.get('/products/?featured=true')
    return { data: Array.isArray(response.data) ? response.data : (response.data.products || []) }
  },
}

// Services API
export const servicesAPI = {
  getAll: async () => {
    const response = await api.get('/services/')
    return { data: Array.isArray(response.data) ? response.data : [] }
  },
}

  // Portfolio API
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
  getAll: () => api.get('/orders/'),
  create: (data: any) => api.post('/orders/', data),
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
    return api.get(`/pricing/pricing-rules?${queryParams.toString()}`)
  },
  getById: (id: number) => api.get(`/pricing/pricing-rules/${id}`),
  create: (data: any) => api.post('/pricing/pricing-rules', data),
  update: (id: number, data: any) => api.put(`/pricing/pricing-rules/${id}`, data),
  delete: (id: number) => api.delete(`/pricing/pricing-rules/${id}`),
  calculatePrice: (data: { calculation_type: string; quantity: number; specifications: any }) =>
    api.post('/pricing/calculate-price', data),
  calculatePriceByRule: (ruleId: number, data: { quantity: number; specifications: any }) =>
    api.post(`/pricing/calculate-price-by-rule/${ruleId}`, data),
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
