import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://khawam-pro-production.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

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
    updateStatus: (id: number, status: string) => api.put(`/admin/orders/${id}/status`, null, {
      params: { status }
    }),
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
}

export default api
