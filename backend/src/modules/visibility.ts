import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware'
import { AppError } from '../middleware/errorHandler'
import { z } from 'zod'

export const visibilityRouter = Router()

// Schema for listing visibility rules
const listVisibilityRulesSchema = z.object({
  body: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(50),
    domainId: z.string().optional(),
    createdBy: z.string().optional(),
  }),
})

// Schema for setting visibility rule
const setVisibilityRuleSchema = z.object({
  body: z.object({
    domainId: z.string(),
    isHidden: z.boolean(),
  }),
})

// Schema for overriding visibility rule (super admin)
const overrideVisibilityRuleSchema = z.object({
  body: z.object({
    ruleId: z.string(),
    isHidden: z.boolean(), // true = force hide, false = force show
  }),
})

/**
 * List visibility rules
 * POST /api/visibility/list
 */
visibilityRouter.post('/list', requireAdmin, validate(listVisibilityRulesSchema), async (req: Request, res: Response) => {
  const { page, limit, domainId, createdBy } = req.body
  const user = req.user!

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  // Non-super-admins can only see rules they created
  if (user.role !== 'SUPER_ADMIN') {
    where.createdBy = user.id
  }

  if (domainId) {
    where.domainId = domainId
  }

  if (createdBy && user.role === 'SUPER_ADMIN') {
    where.createdBy = createdBy
  }

  const [rules, total] = await Promise.all([
    prisma.anonymousVisibilityRule.findMany({
      where,
      skip,
      take: limit,
      include: {
        domain: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.anonymousVisibilityRule.count({ where }),
  ])

  res.json({
    data: rules,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Set visibility rule for a domain
 * POST /api/visibility
 */
visibilityRouter.post('/', requireAdmin, validate(setVisibilityRuleSchema), async (req: Request, res: Response) => {
  const { domainId, isHidden } = req.body
  const user = req.user!

  // Check domain access
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
  })

  if (!domain) {
    throw new AppError(404, 'Domain not found')
  }

  if (user.role !== 'SUPER_ADMIN' && domain.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to set visibility for this domain')
  }

  // Upsert the visibility rule
  const rule = await prisma.anonymousVisibilityRule.upsert({
    where: {
      domainId_createdBy: {
        domainId,
        createdBy: user.id,
      },
    },
    create: {
      domainId,
      isHidden,
      createdBy: user.id,
    },
    update: {
      isHidden,
    },
  })

  res.json({
    status: 'success',
    data: rule,
  })
})

/**
 * Override visibility rule (Super Admin only)
 * PUT /api/visibility/override
 */
visibilityRouter.put('/override', requireSuperAdmin, validate(overrideVisibilityRuleSchema), async (req: Request, res: Response) => {
  const { ruleId, isHidden } = req.body
  const user = req.user!

  const rule = await prisma.anonymousVisibilityRule.findUnique({
    where: { id: ruleId },
  })

  if (!rule) {
    throw new AppError(404, 'Visibility rule not found')
  }

  const updatedRule = await prisma.anonymousVisibilityRule.update({
    where: { id: ruleId },
    data: {
      isHidden,
      isOverride: true,
      overrideBy: user.id,
    },
  })

  res.json({
    status: 'success',
    data: updatedRule,
  })
})

/**
 * Remove override (Super Admin only)
 * DELETE /api/visibility/override/:id
 */
visibilityRouter.delete('/override/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  const rule = await prisma.anonymousVisibilityRule.findUnique({
    where: { id },
  })

  if (!rule) {
    throw new AppError(404, 'Visibility rule not found')
  }

  const updatedRule = await prisma.anonymousVisibilityRule.update({
    where: { id },
    data: {
      isOverride: false,
      overrideBy: null,
    },
  })

  res.json({
    status: 'success',
    data: updatedRule,
  })
})

/**
 * Delete visibility rule
 * DELETE /api/visibility/:id
 */
visibilityRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const rule = await prisma.anonymousVisibilityRule.findUnique({
    where: { id },
    include: { domain: true },
  })

  if (!rule) {
    throw new AppError(404, 'Visibility rule not found')
  }

  // Check permission
  if (user.role !== 'SUPER_ADMIN' && rule.createdBy !== user.id) {
    throw new AppError(403, 'You do not have permission to delete this rule')
  }

  await prisma.anonymousVisibilityRule.delete({
    where: { id },
  })

  res.json({
    status: 'success',
    message: 'Visibility rule deleted successfully',
  })
})
