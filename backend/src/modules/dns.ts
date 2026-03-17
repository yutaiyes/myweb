import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'
import { AppError } from '../middleware/errorHandler'
import { z } from 'zod'

export const dnsRouter = Router()

// Schema for listing DNS records
const listDnsRecordsSchema = z.object({
  body: z.object({
    domainId: z.string(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(50),
    recordType: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
})

// Schema for creating DNS record
const createDnsRecordSchema = z.object({
  body: z.object({
    domainId: z.string(),
    recordType: z.string().min(1),
    name: z.string().min(1),
    content: z.string().min(1),
    ttl: z.number().int().min(1).default(3600),
    priority: z.number().int().optional(),
    proxied: z.boolean().default(false),
    cfRecordId: z.string().optional(),
  }),
})

// Schema for updating DNS record
const updateDnsRecordSchema = z.object({
  body: z.object({
    recordType: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
    ttl: z.number().int().min(1).optional(),
    priority: z.number().int().optional(),
    proxied: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
})

/**
 * List DNS records for a domain
 * POST /api/dns-records/list
 */
dnsRouter.post('/list', requireAuth, validate(listDnsRecordsSchema), async (req: Request, res: Response) => {
  const { domainId, page, limit, recordType, isActive } = req.body
  const user = req.user!

  // Check domain access
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
  })

  if (!domain) {
    throw new AppError(404, 'Domain not found')
  }

  if (user.role !== 'SUPER_ADMIN' && domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to access this domain')
  }

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { domainId }

  if (recordType) {
    where.recordType = recordType
  }

  if (isActive !== undefined) {
    where.isActive = isActive
  }

  const [records, total] = await Promise.all([
    prisma.dnsRecord.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ recordType: 'asc' }, { name: 'asc' }],
    }),
    prisma.dnsRecord.count({ where }),
  ])

  res.json({
    data: records,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Create DNS record
 * POST /api/dns-records
 */
dnsRouter.post('/', requireAdmin, validate(createDnsRecordSchema), async (req: Request, res: Response) => {
  const user = req.user!
  const data = req.body

  // Check domain access
  const domain = await prisma.domain.findUnique({
    where: { id: data.domainId },
  })

  if (!domain) {
    throw new AppError(404, 'Domain not found')
  }

  if (user.role !== 'SUPER_ADMIN' && domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to access this domain')
  }

  // Check for duplicate record
  const existingRecord = await prisma.dnsRecord.findFirst({
    where: {
      domainId: data.domainId,
      name: data.name,
      recordType: data.recordType,
    },
  })

  if (existingRecord) {
    throw new AppError(409, 'DNS record with this name and type already exists')
  }

  const record = await prisma.dnsRecord.create({
    data: {
      domainId: data.domainId,
      recordType: data.recordType,
      name: data.name,
      content: data.content,
      ttl: data.ttl || 3600,
      priority: data.priority,
      proxied: data.proxied || false,
      cfRecordId: data.cfRecordId,
    },
  })

  res.status(201).json({
    status: 'success',
    data: record,
  })
})

/**
 * Update DNS record
 * PUT /api/dns-records/:id
 */
dnsRouter.put('/:id', requireAdmin, validate(updateDnsRecordSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!
  const data = req.body

  const record = await prisma.dnsRecord.findUnique({
    where: { id },
    include: { domain: true },
  })

  if (!record) {
    throw new AppError(404, 'DNS record not found')
  }

  if (user.role !== 'SUPER_ADMIN' && record.domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to update this record')
  }

  const updatedRecord = await prisma.dnsRecord.update({
    where: { id },
    data: {
      recordType: data.recordType,
      name: data.name,
      content: data.content,
      ttl: data.ttl,
      priority: data.priority,
      proxied: data.proxied,
      isActive: data.isActive,
    },
  })

  res.json({
    status: 'success',
    data: updatedRecord,
  })
})

/**
 * Delete DNS record
 * DELETE /api/dns-records/:id
 */
dnsRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const record = await prisma.dnsRecord.findUnique({
    where: { id },
    include: { domain: true },
  })

  if (!record) {
    throw new AppError(404, 'DNS record not found')
  }

  if (user.role !== 'SUPER_ADMIN' && record.domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to delete this record')
  }

  await prisma.dnsRecord.delete({
    where: { id },
  })

  res.json({
    status: 'success',
    message: 'DNS record deleted successfully',
  })
})
