import { z } from 'zod'
import { paginationSchema } from './common.types'

// Role enum values
const roleValues = ['VIEWER', 'ADMIN', 'SUPER_ADMIN'] as const

// User list schema
export const listUsersSchema = z.object({
  body: paginationSchema.extend({
    search: z.string().optional(),
    role: z.enum(roleValues).optional(),
    groupId: z.string().optional(),
  }),
})

// Update user role schema
export const updateUserRoleSchema = z.object({
  body: z.object({
    role: z.enum(roleValues),
  }),
})

// Update user group schema
export const updateUserGroupSchema = z.object({
  body: z.object({
    groupId: z.string().nullable(),
  }),
})

export type ListUsersInput = z.infer<typeof listUsersSchema>['body']
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>['body']
export type UpdateUserGroupInput = z.infer<typeof updateUserGroupSchema>['body']
