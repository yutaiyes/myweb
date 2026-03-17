import { z } from 'zod'

// Common pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// Common response types
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Common API response wrapper
export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message?: string
  data?: T
}
