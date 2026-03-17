import { z } from 'zod'
import { paginationSchema } from './common.types'

// Admin group creation schema
export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Group name is required'),
    description: z.string().optional(),
  }),
})

// Admin group update schema
export const updateGroupSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
  }),
})

// Admin group list schema
export const listGroupsSchema = z.object({
  body: paginationSchema.extend({
    search: z.string().optional(),
  }),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body']
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body']
export type ListGroupsInput = z.infer<typeof listGroupsSchema>['body']
