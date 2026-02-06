/**
 * API service for making HTTP requests to the backend.
 */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore'
import type { 
  ApiError, 
  User, 
  TokenResponse, 
  CompanyProfile, 
  ProfileFormData,
  SearchStartResponse,
  SearchStatusResponse,
  SavedOpportunity,
  SearchHistory
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

    // If 401 and not already retrying, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })

          const { access_token, refresh_token } = response.data
          useAuthStore.getState().setTokens(access_token, refresh_token)

          // Retry original request
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, logout
          useAuthStore.getState().logout()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export { api }

// Helper to extract error message
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    return axiosError.response?.data?.detail || axiosError.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unexpected error occurred'
}

// ============================================================================
// Type exports for API requests/responses
// ============================================================================
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  confirm_password?: string  // Only used for frontend validation, not sent to API
}

export interface AuthResponse {
  user: User
  access_token: string
  refresh_token: string
}

export interface CompanyProfileUpdate extends Partial<ProfileFormData> {}

export interface SAMKeyUpdate {
  api_key: string
}

export interface SearchRequest {
  keywords?: string
  naics_codes?: string[]
  notice_types?: string[]
  set_aside_types?: string[]
  ptype?: string
  type_of_set_aside?: string
  place_of_performance_state?: string
  posted_from?: string
  posted_to?: string
  response_deadline_from?: string
  response_deadline_to?: string
}

export interface SaveOpportunityRequest {
  notice_id: string
  title: string
  solicitation_number?: string
  agency?: string
  posted_date?: string
  response_deadline?: string
  relevance_score?: number
  ai_analysis?: object
  recommendation?: string
  opportunity_data: object
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pages: number
}

// ============================================================================
// Auth API
// ============================================================================
export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },
  
  register: async (data: RegisterRequest): Promise<User> => {
    // Only send email and password to backend
    const response = await api.post('/auth/register', {
      email: data.email,
      password: data.password,
    })
    return response.data
  },
  
  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },
  
  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken })
    return response.data
  },
  
  me: async (): Promise<User> => {
    const response = await api.get('/auth/me')
    return response.data
  }
}

// ============================================================================
// Profile API
// ============================================================================
export const profileApi = {
  get: async (): Promise<CompanyProfile | null> => {
    try {
      const response = await api.get('/profile')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null  // Profile doesn't exist yet
      }
      throw error
    }
  },
  
  update: async (data: CompanyProfileUpdate): Promise<CompanyProfile> => {
    const response = await api.put('/profile', data)
    return response.data
  },
  
  getSAMKeyStatus: async (): Promise<{ has_key: boolean; expires_at: string | null }> => {
    const response = await api.get('/auth/sam-key/status')
    return response.data
  },
  
  updateSAMKey: async (data: SAMKeyUpdate): Promise<{ message: string }> => {
    const response = await api.put('/auth/sam-key', data)
    return response.data
  },
  
  deleteSAMKey: async (): Promise<{ message: string }> => {
    const response = await api.delete('/auth/sam-key')
    return response.data
  }
}

// ============================================================================
// Search API
// ============================================================================
export const searchApi = {
  search: async (data: SearchRequest): Promise<SearchStartResponse> => {
    const response = await api.post('/search/start', data)
    return response.data
  },
  
  getStatus: async (jobId: string): Promise<SearchStatusResponse> => {
    const response = await api.get(`/jobs/${jobId}/status`)
    return response.data
  },
  
  getHistory: async (page = 1, limit = 10): Promise<PaginatedResponse<SearchHistory>> => {
    const response = await api.get('/search/history', { params: { page, limit } })
    return response.data
  },
  
  getSavedOpportunities: async (page = 1, limit = 10): Promise<PaginatedResponse<SavedOpportunity>> => {
    const response = await api.get('/search/saved', { params: { page, limit } })
    return response.data
  },
  
  saveOpportunity: async (data: SaveOpportunityRequest): Promise<SavedOpportunity> => {
    const response = await api.post('/search/save', data)
    return response.data
  },
  
  unsaveOpportunity: async (noticeId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/search/saved/${noticeId}`)
    return response.data
  },
  
  updateOpportunityStatus: async (noticeId: string, status: string, notes?: string): Promise<SavedOpportunity> => {
    const response = await api.patch(`/search/saved/${noticeId}`, { user_status: status, user_notes: notes })
    return response.data
  }
}

// ============================================================================
// Jobs API
// ============================================================================
export const jobsApi = {
  getStatus: async (jobId: string): Promise<SearchStatusResponse> => {
    const response = await api.get(`/jobs/${jobId}/status`)
    return response.data
  },
  
  cancel: async (jobId: string): Promise<{ message: string }> => {
    const response = await api.post(`/jobs/${jobId}/cancel`)
    return response.data
  }
}
