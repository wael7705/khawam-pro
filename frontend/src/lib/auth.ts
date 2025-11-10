import api from './api'

export interface User {
  id: number
  name: string
  email?: string
  phone?: string
  user_type: {
    id: number
    name_ar: string
    name_en?: string
  }
  is_active: boolean
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: User
}

// Auth API
export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', {
      username,
      password
    })
    return response.data
  },

  getCurrentUser: async (): Promise<User> => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      throw new Error('No token found')
    }
    
    const response = await api.get('/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    return response.data
  },

  logout: async () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  }
}

// Check if user is logged in
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('auth_token')
}

// Get stored token
export const getToken = (): string | null => {
  const token = localStorage.getItem('auth_token')
  
  // التحقق من أن token ليس "null" أو "undefined" كسلسلة نصية
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    console.warn('⚠️ No valid token found in localStorage', { token, length: token?.length })
    return null
  }
  
  // التحقق من أن token ليس قصيراً جداً (JWT tokens عادة تكون أطول من 20 حرف)
  if (token.length < 20) {
    console.warn('⚠️ Token seems invalid (too short):', token.substring(0, 10) + '...')
    return null
  }
  
  console.log('✅ Valid token found:', token.substring(0, 20) + '...')
  return token
}

// Get stored user data
export const getUserData = (): User | null => {
  const userData = localStorage.getItem('user_data')
  if (userData) {
    try {
      const parsed = JSON.parse(userData)
      // إذا كان name_ar null، حاول تحديث البيانات من API
      if (parsed?.user_type?.name_ar === null || parsed?.user_type?.name_ar === undefined) {
        // البيانات قديمة، ولكن سنتركها للآن لتجنب طلبات API إضافية
        // المستخدم يجب أن يسجل الخروج ويدخل مرة أخرى
      }
      return parsed
    } catch {
      return null
    }
  }
  return null
}

// Check if user is admin
export const isAdmin = (): boolean => {
  const user = getUserData()
  return user?.user_type.name_ar === 'مدير'
}

// Check if user is employee
export const isEmployee = (): boolean => {
  const user = getUserData()
  return user?.user_type.name_ar === 'موظف'
}

// Check if user is customer
export const isCustomer = (): boolean => {
  const user = getUserData()
  return user?.user_type.name_ar === 'عميل'
}


