import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Products API
export const productsAPI = {
  getAll: async () => {
    const response = await api.get('/api/products/')
    return { data: Array.isArray(response.data) ? response.data : (response.data.products || []) }
  },
  getById: (id: number) => api.get(`/api/products/${id}`),
  getFeatured: async () => {
    const response = await api.get('/api/products/?featured=true')
    return { data: Array.isArray(response.data) ? response.data : (response.data.products || []) }
  },
}

// Services API
export const servicesAPI = {
  getAll: async () => {
    const response = await api.get('/api/services/')
    return { data: Array.isArray(response.data) ? response.data : [] }
  },
}

// Portfolio API
export const portfolioAPI = {
  getAll: async () => {
    const response = await api.get('/api/portfolio/')
    return { data: Array.isArray(response.data) ? response.data : [] }
  },
  getFeatured: async () => {
    const response = await api.get('/api/portfolio/featured')
    return { data: Array.isArray(response.data) ? response.data : [] }
  },
}

// Orders API
export const ordersAPI = {
  getAll: () => api.get('/api/orders/'),
  create: (data: any) => api.post('/api/orders/', data),
}

// Studio API
export const studioAPI = {
  removeBackground: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/studio/remove-background', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

// Admin API
export const adminAPI = {
  // Products
  products: {
    getAll: () => api.get('/api/admin/products/all'),
    create: (data: any) => api.post('/api/admin/products', data),
    update: (id: number, data: any) => api.put(`/api/admin/products/${id}`, data),
    delete: (id: number) => api.delete(`/api/admin/products/${id}`),
  },
  
  // Services
  services: {
    getAll: () => api.get('/api/admin/services/all'),
    create: (data: any) => api.post('/api/admin/services', data),
    update: (id: number, data: any) => api.put(`/api/admin/services/${id}`, data),
    delete: (id: number) => api.delete(`/api/admin/services/${id}`),
  },
  
  // Portfolio Works
  works: {
    getAll: () => api.get('/api/admin/works/all'),
    create: (data: any) => api.post('/api/admin/works', data),
    update: (id: number, data: any) => api.put(`/api/admin/works/${id}`, data),
    delete: (id: number) => api.delete(`/api/admin/works/${id}`),
  },
  
  // Orders
  orders: {
    getAll: () => api.get('/api/admin/orders/all'),
    updateStatus: (id: number, status: string) => api.put(`/api/admin/orders/${id}/status`, null, {
      params: { status }
    }),
  },
  
  // Upload
  upload: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post('/api/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },
}

export default api
