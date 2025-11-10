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
  const token = getToken() // استخدام getToken للتحقق من صحة Token
  return !!token
}

// Cleanup invalid tokens on module load - فقط نزيل tokens غير صالحة (null/undefined كسلسلة)
// لا نحذف tokens القصيرة لأنها قد تكون tokens مخصصة (مثل admin_token_1)
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('auth_token')
  // فقط نحذف إذا كانت القيمة حرفياً 'null' أو 'undefined' كسلسلة نصية
  if (token === 'null' || token === 'undefined') {
    console.warn('🧹 Cleaning up invalid token string on module load:', token)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
  }
  // لا نحذف tokens القصيرة - قد تكون tokens مخصصة صالحة
}

// Get stored token - مع دعم Token مخصص (لا نحذف tokens القصيرة لأنها قد تكون tokens مخصصة)
export const getToken = (): string | null => {
  const token = localStorage.getItem('auth_token')
  
  // تنظيف: إذا كان token هو 'null' أو 'undefined' كسلسلة، احذفه
  if (token === 'null' || token === 'undefined') {
    console.warn('⚠️ Found invalid token string in localStorage, removing it...', { token })
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    return null
  }
  
  // التحقق من أن token ليس "null" أو "undefined" كسلسلة نصية
  if (!token || token.trim() === '') {
    return null
  }
  
  // لا نحذف tokens القصيرة لأنها قد تكون tokens مخصصة (مثل "admin_token_1")
  // فقط نتحقق من أنها ليست فارغة تماماً
  if (token.trim().length === 0) {
    console.warn('⚠️ Token is empty, removing it')
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_data')
    return null
  }
  
  // إذا كان Token موجوداً وليس 'null' أو 'undefined'، نرجعه (حتى لو كان قصيراً)
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


