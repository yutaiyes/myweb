import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth.middleware'
import {
  createDomainSchema,
  updateDomainSchema,
  listDomainsSchema,
  listPublicDomainsSchema,
} from '../types/domain.types'
import { AppError } from '../middleware/errorHandler'

export const domainRouter = Router()

/**
 * List public domains (anonymous access)
 * POST /api/domains/public
 */
domainRouter.post('/public', validate(listPublicDomainsSchema), async (req: Request, res: Response) => {
  const { page, limit, search } = req.body

  const skip = (page - 1) * limit

  // Get domains that are NOT hidden (visible to public)
  const where = {
    AND: [
      // Domain is not marked as hidden by any admin
      {
        NOT: {
          visibilityRules: {
            some: {
              isHidden: true,
              isOverride: false, // Not overridden by super admin to show
            },
          },
        },
      },
      // Or is explicitly marked to show by super admin override
      {
        OR: [
          { visibilityRules: { none: {} } },
          {
            visibilityRules: {
              some: {
                isHidden: false,
                isOverride: true,
              },
            },
          },
        ],
      },
      search ? { name: { contains: search, mode: 'insensitive' } } : {},
    ],
  }

  const [domains, total] = await Promise.all([
    prisma.domain.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        // Don't expose sensitive info like expiration date
      },
      orderBy: { name: 'asc' },
    }),
    prisma.domain.count({ where }),
  ])

  res.json({
    data: domains,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * List domains (authenticated, with permission filtering)
 * POST /api/domains/list
 */
domainRouter.post('/list', requireAuth, validate(listDomainsSchema), async (req: Request, res: Response) => {
  const { page, limit, search, status, registrarId, groupId, sortBy, sortOrder } = req.body
  const user = req.user!

  const skip = (page - 1) * limit

  // Build where clause based on user role
  const where: Record<string, unknown> = {}

  // Non-super-admins can only see domains in their group
  if (user.role !== 'SUPER_ADMIN') {
    if (user.role === 'ADMIN') {
      where.groupId = user.groupId
    } else {
      // VIEWER can only see domains in their group
      where.groupId = user.groupId
    }
  }

  // Apply filters
  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }
  if (status) {
    where.status = status
  }
  if (registrarId) {
    where.registrarId = registrarId
  }
  if (groupId && user.role === 'SUPER_ADMIN') {
    where.groupId = groupId
  }

  const [domains, total] = await Promise.all([
    prisma.domain.findMany({
      where,
      skip,
      take: limit,
      include: {
        registrar: {
          select: { id: true, name: true, displayName: true },
        },
        group: {
          select: { id: true, name: true },
        },
        _count: {
          select: { dnsRecords: true, reminders: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.domain.count({ where }),
  ])

  res.json({
    data: domains,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Get domain by ID
 * GET /api/domains/:id
 */
domainRouter.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user

  const domain = await prisma.domain.findUnique({
    where: { id },
    include: {
      registrar: true,
      registrarAccount: {
        select: { id: true, displayName: true, registrarId: true },
      },
      group: true,
      dnsRecords: {
        where: { isActive: true },
        orderBy: { recordType: 'asc' },
      },
      reminders: {
        where: { isClosed: false },
        orderBy: { remindAt: 'asc' },
        take: 5,
      },
    },
  })

  if (!domain) {
    throw new AppError(404, 'Domain not found')
  }

  // Check visibility for anonymous users
  if (!user) {
    // Check if domain is hidden
    const visibilityRule = await prisma.anonymousVisibilityRule.findFirst({
      where: {
        domainId: id,
        isHidden: true,
      },
    })

    if (visibilityRule && !visibilityRule.isOverride) {
      // Return limited info for hidden domains
      res.json({
        id: domain.id,
        name: domain.name,
        status: domain.status,
      })
      return
    }

    // Return public info only
    res.json({
      id: domain.id,
      name: domain.name,
      status: domain.status,
      registrar: domain.registrar ? { displayName: domain.registrar.displayName } : null,
      dnsRecords: domain.dnsRecords.map((r) => ({
        recordType: r.recordType,
        name: r.name,
        content: r.content,
        ttl: r.ttl,
      })),
    })
    return
  }

  // Check permission for logged-in users
  if (user.role !== 'SUPER_ADMIN' && domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to view this domain')
  }

  res.json(domain)
})

/**
 * Create domain
 * POST /api/domains
 */
domainRouter.post('/', requireAdmin, validate(createDomainSchema), async (req: Request, res: Response) => {
  const user = req.user!
  const data = req.body

  // Check if domain already exists
  const existingDomain = await prisma.domain.findUnique({
    where: { name: data.name },
  })

  if (existingDomain) {
    throw new AppError(409, 'Domain already exists')
  }

  // Set group based on user role
  const groupId = user.role === 'SUPER_ADMIN' ? data.groupId : user.groupId

  const domain = await prisma.domain.create({
    data: {
      name: data.name,
      registrarId: data.registrarId,
      registrarAccountId: data.registrarAccountId,
      cfZoneId: data.cfZoneId,
      cfZoneName: data.cfZoneName,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      groupId,
      reminderDays: data.reminderDays || 30,
      notes: data.notes,
    },
    include: {
      registrar: true,
      group: true,
    },
  })

  res.status(201).json({
    status: 'success',
    data: domain,
  })
})

/**
 * Update domain
 * PUT /api/domains/:id
 */
domainRouter.put('/:id', requireAdmin, validate(updateDomainSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!
  const data = req.body

  const existingDomain = await prisma.domain.findUnique({
    where: { id },
  })

  if (!existingDomain) {
    throw new AppError(404, 'Domain not found')
  }

  // Check permission
  if (user.role !== 'SUPER_ADMIN' && existingDomain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to update this domain')
  }

  const domain = await prisma.domain.update({
    where: { id },
    data: {
      name: data.name,
      registrarId: data.registrarId,
      registrarAccountId: data.registrarAccountId,
      cfZoneId: data.cfZoneId,
      cfZoneName: data.cfZoneName,
      registrationDate: data.registrationDate ? new Date(data.registrationDate) : null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      status: data.status,
      groupId: user.role === 'SUPER_ADMIN' ? data.groupId : undefined,
      reminderDays: data.reminderDays,
      notes: data.notes,
    },
    include: {
      registrar: true,
      group: true,
    },
  })

  res.json({
    status: 'success',
    data: domain,
  })
})

/**
 * Delete domain
 * DELETE /api/domains/:id
 */
domainRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const domain = await prisma.domain.findUnique({
    where: { id },
  })

  if (!domain) {
    throw new AppError(404, 'Domain not found')
  }

  // Check permission
  if (user.role !== 'SUPER_ADMIN' && domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to delete this domain')
  }

  await prisma.domain.delete({
    where: { id },
  })

  res.json({
    status: 'success',
    message: 'Domain deleted successfully',
  })
})
