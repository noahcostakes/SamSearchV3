/**
 * API service for making HTTP requests to the backend.
 */
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios"

import { useAuthStore } from "@/stores/authStore"
import type {
  ApiError,
  CompanyProfile,
  ProfileFormData,
  SavedOpportunity,
  SearchHistory,
  SearchHistoryDetail,
  SearchStartResponse,
  SearchStatusResponse,
  TokenResponse,
  User,
} from "@/types"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }
    const requestUrl = originalRequest?.url || ""

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !requestUrl.includes("/auth/login") &&
      !requestUrl.includes("/auth/refresh")
    ) {
      originalRequest._retry = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const response = await axios.post<TokenResponse>(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          })
          const { access_token, refresh_token } = response.data
          useAuthStore.getState().setTokens(access_token, refresh_token)

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`
          }
          return api(originalRequest)
        } catch (refreshError) {
          useAuthStore.getState().logout()
          window.location.href = "/login"
          return Promise.reject(refreshError)
        }
      }

      useAuthStore.getState().logout()
      window.location.href = "/login"
    }

    return Promise.reject(error)
  }
)

export { api }

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>
    return axiosError.response?.data?.detail || axiosError.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return "An unexpected error occurred"
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
  confirm_password?: string
}

export interface CompanyProfileUpdate extends Partial<ProfileFormData> {}

export interface SAMKeyUpdate {
  api_key: string
}

export interface SearchRequest {
  days_back: number
}

export interface SaveOpportunityRequest {
  notice_id: string
  opportunity_data: object
  relevance_score?: number
  ai_analysis?: object
  recommendation?: string
  user_notes?: string
}

// ============================================================================
// Auth API
// ============================================================================
export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post("/auth/login", data)
    return response.data
  },

  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post("/auth/register", {
      email: data.email,
      password: data.password,
    })
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout")
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await api.post("/auth/refresh", { refresh_token: refreshToken })
    return response.data
  },

  me: async (): Promise<User> => {
    const response = await api.get("/auth/me")
    return response.data
  },
}

// ============================================================================
// Profile API
// ============================================================================
export const profileApi = {
  get: async (): Promise<CompanyProfile | null> => {
    try {
      const response = await api.get("/profile")
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  update: async (data: CompanyProfileUpdate): Promise<CompanyProfile> => {
    const response = await api.put("/profile", data)
    return response.data
  },

  getSAMKeyStatus: async (): Promise<{ has_key: boolean; expires_at: string | null }> => {
    const response = await api.get("/auth/sam-key/status")
    return response.data
  },

  updateSAMKey: async (data: SAMKeyUpdate): Promise<{ message: string }> => {
    const response = await api.put("/auth/sam-key", data)
    return response.data
  },

  deleteSAMKey: async (): Promise<{ message: string }> => {
    const response = await api.delete("/auth/sam-key")
    return response.data
  },
}

// ============================================================================
// Search API
// ============================================================================
export const searchApi = {
  search: async (data: SearchRequest): Promise<SearchStartResponse> => {
    const response = await api.post("/search/start", data)
    return response.data
  },

  getStatus: async (jobId: string): Promise<SearchStatusResponse> => {
    const response = await api.get(`/jobs/${jobId}/status`)
    return response.data
  },

  getHistory: async (limit = 10, offset = 0): Promise<SearchHistory[]> => {
    const response = await api.get("/search/history", { params: { limit, offset } })
    return response.data
  },

  getHistoryById: async (searchId: string): Promise<SearchHistoryDetail> => {
    const response = await api.get(`/search/history/${searchId}`)
    return response.data
  },

  getSavedOpportunities: async (
    statusFilter?: "saved" | "pursuing" | "passed",
    limit = 50,
    offset = 0
  ): Promise<SavedOpportunity[]> => {
    const response = await api.get("/search/saved", {
      params: { status_filter: statusFilter, limit, offset },
    })
    return response.data
  },

  saveOpportunity: async (data: SaveOpportunityRequest): Promise<SavedOpportunity> => {
    const response = await api.post("/search/save", data)
    return response.data
  },

  unsaveOpportunity: async (opportunityId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/search/saved/${opportunityId}`)
    return response.data
  },

  updateOpportunityStatus: async (
    opportunityId: string,
    status: "saved" | "pursuing" | "passed",
    notes?: string
  ): Promise<SavedOpportunity> => {
    const response = await api.put(`/search/saved/${opportunityId}`, {
      user_status: status,
      user_notes: notes,
    })
    return response.data
  },
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
    const response = await api.delete(`/jobs/${jobId}`)
    return response.data
  },
}

