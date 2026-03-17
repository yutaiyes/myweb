import { z } from 'zod'
import { paginationSchema } from './common.types'

// Registrar creation schema
export const createRegistrarSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Registrar name is required'),
    displayName: z.string().min(1, 'Display name is required'),
    website: z.string().url().optional(),
    notes: z.string().optional(),
  }),
})

// Registrar update schema
export const updateRegistrarSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).optional(),
    website: z.string().url().nullable().optional(),
    isEnabled: z.boolean().optional(),
    notes: z.string().nullable().optional(),
  }),
})

// Registrar list schema
export const listRegistrarsSchema = z.object({
  body: paginationSchema.extend({
    search: z.string().optional(),
    isEnabled: z.boolean().optional(),
  }),
})

// Registrar account creation schema
export const createRegistrarAccountSchema = z.object({
  body: z.object({
    registrarId: z.string().min(1, 'Registrar ID is required'),
    displayName: z.string().min(1, 'Display name is required'),
    credentials: z.record(z.unknown()), // API credentials as JSON
    groupId: z.string().optional(),
  }),
})

// Registrar account update schema
export const updateRegistrarAccountSchema = z.object({
  body: z.object({
    displayName: z.string().min(1).optional(),
    credentials: z.record(z.unknown()).optional(),
    groupId: z.string().nullable().optional(),
  }),
})

export type CreateRegistrarInput = z.infer<typeof createRegistrarSchema>['body']
export type UpdateRegistrarInput = z.infer<typeof updateRegistrarSchema>['body']
export type ListRegistrarsInput = z.infer<typeof listRegistrarsSchema>['body']
export type CreateRegistrarAccountInput = z.infer<typeof createRegistrarAccountSchema>['body']
export type UpdateRegistrarAccountInput = z.infer<typeof updateRegistrarAccountSchema>['body']
