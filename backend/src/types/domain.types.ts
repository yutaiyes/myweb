import { z } from 'zod'
import { paginationSchema } from './common.types'

// Domain status enum values
const domainStatusValues = ['ACTIVE', 'EXPIRING', 'EXPIRED'] as const

// Domain creation schema
export const createDomainSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Domain name is required'),
    registrarId: z.string().optional(),
    registrarAccountId: z.string().optional(),
    cfZoneId: z.string().optional(),
    cfZoneName: z.string().optional(),
    registrationDate: z.string().datetime().optional(),
    expirationDate: z.string().datetime().optional(),
    groupId: z.string().optional(),
    reminderDays: z.number().int().min(1).max(90).default(30),
    notes: z.string().optional(),
  }),
})

// Domain update schema
export const updateDomainSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    registrarId: z.string().nullable().optional(),
    registrarAccountId: z.string().nullable().optional(),
    cfZoneId: z.string().nullable().optional(),
    cfZoneName: z.string().nullable().optional(),
    registrationDate: z.string().datetime().nullable().optional(),
    expirationDate: z.string().datetime().nullable().optional(),
    status: z.enum(domainStatusValues).optional(),
    groupId: z.string().nullable().optional(),
    reminderDays: z.number().int().min(1).max(90).optional(),
    notes: z.string().nullable().optional(),
  }),
})

// Domain list schema
export const listDomainsSchema = z.object({
  body: paginationSchema.extend({
    search: z.string().optional(),
    status: z.enum(domainStatusValues).optional(),
    registrarId: z.string().optional(),
    groupId: z.string().optional(),
    sortBy: z.enum(['name', 'expirationDate', 'createdAt']).default('expirationDate'),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
})

// Public domains list schema
export const listPublicDomainsSchema = z.object({
  body: paginationSchema.extend({
    search: z.string().optional(),
  }),
})

export type CreateDomainInput = z.infer<typeof createDomainSchema>['body']
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>['body']
export type ListDomainsInput = z.infer<typeof listDomainsSchema>['body']
export type ListPublicDomainsInput = z.infer<typeof listPublicDomainsSchema>['body']
