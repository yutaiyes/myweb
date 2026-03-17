import axios, { AxiosError } from 'axios'
import { supabase } from './supabase'

/**
 * Axios instance configured for API requests
 * Uses Vite proxy to forward /api requests to http://localhost:3000
 */
export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor
 * Automatically adds authentication token to requests if available
 */
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor
 * Handles common error scenarios like 401 unauthorized
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      supabase.auth.signOut()
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden')
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('Server error occurred')
    }

    return Promise.reject(error)
  }
)

/**
 * Type-safe error handler for API errors
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}

export default apiClient
