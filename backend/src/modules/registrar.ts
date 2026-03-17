import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware'
import {
  createRegistrarSchema,
  updateRegistrarSchema,
  listRegistrarsSchema,
} from '../types/registrar.types'
import { AppError } from '../middleware/errorHandler'

export const registrarRouter = Router()

/**
 * List registrars
 * POST /api/registrars/list
 */
registrarRouter.post('/list', requireAdmin, validate(listRegistrarsSchema), async (req: Request, res: Response) => {
  const { page, limit, search, isEnabled } = req.body

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (isEnabled !== undefined) {
    where.isEnabled = isEnabled
  }

  const [registrars, total] = await Promise.all([
    prisma.registrar.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { domains: true, accounts: true },
        },
      },
      orderBy: { displayName: 'asc' },
    }),
    prisma.registrar.count({ where }),
  ])

  res.json({
    data: registrars,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Get registrar by ID
 * GET /api/registrars/:id
 */
registrarRouter.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  const registrar = await prisma.registrar.findUnique({
    where: { id },
    include: {
      accounts: {
        select: {
          id: true,
          displayName: true,
          groupId: true,
          createdAt: true,
        },
      },
      _count: {
        select: { domains: true },
      },
    },
  })

  if (!registrar) {
    throw new AppError(404, 'Registrar not found')
  }

  res.json(registrar)
})

/**
 * Create registrar (Super Admin only)
 * POST /api/registrars
 */
registrarRouter.post('/', requireSuperAdmin, validate(createRegistrarSchema), async (req: Request, res: Response) => {
  const data = req.body

  // Check if registrar with same name exists
  const existingRegistrar = await prisma.registrar.findUnique({
    where: { name: data.name },
  })

  if (existingRegistrar) {
    throw new AppError(409, 'Registrar with this name already exists')
  }

  const registrar = await prisma.registrar.create({
    data: {
      name: data.name,
      displayName: data.displayName,
      website: data.website,
      notes: data.notes,
    },
  })

  res.status(201).json({
    status: 'success',
    data: registrar,
  })
})

/**
 * Update registrar (Super Admin only)
 * PUT /api/registrars/:id
 */
registrarRouter.put('/:id', requireSuperAdmin, validate(updateRegistrarSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const data = req.body

  const registrar = await prisma.registrar.update({
    where: { id },
    data: {
      displayName: data.displayName,
      website: data.website,
      isEnabled: data.isEnabled,
      notes: data.notes,
    },
  })

  res.json({
    status: 'success',
    data: registrar,
  })
})

/**
 * Delete registrar (Super Admin only)
 * DELETE /api/registrars/:id
 */
registrarRouter.delete('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  const { id } = req.params

  // Check if registrar has domains
  const domainsCount = await prisma.domain.count({
    where: { registrarId: id },
  })

  if (domainsCount > 0) {
    throw new AppError(400, 'Cannot delete registrar with associated domains')
  }

  await prisma.registrar.delete({
    where: { id },
  })

  res.json({
    status: 'success',
    message: 'Registrar deleted successfully',
  })
})

/**
 * List registrar accounts
 * POST /api/registrars/:id/accounts
 */
registrarRouter.post('/:id/accounts', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const accounts = await prisma.registrarAccount.findMany({
    where: {
      registrarId: id,
      // Non-super-admins can only see accounts for their group
      ...(user.role !== 'SUPER_ADMIN' ? { groupId: user.groupId } : {}),
    },
    select: {
      id: true,
      displayName: true,
      groupId: true,
      createdAt: true,
    },
  })

  res.json({ data: accounts })
})
