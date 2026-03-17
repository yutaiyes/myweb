import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin } from '../middleware/auth.middleware'
import { createGroupSchema, updateGroupSchema, listGroupsSchema } from '../types/group.types'
import { AppError } from '../middleware/errorHandler'

export const groupRouter = Router()

/**
 * List admin groups
 * POST /api/groups/list
 */
groupRouter.post('/list', requireAdmin, validate(listGroupsSchema), async (req: Request, res: Response) => {
  const { page, limit, search } = req.body
  const user = req.user!

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  // Non-super-admins can only see their own group
  if (user.role !== 'SUPER_ADMIN') {
    where.id = user.groupId
  }

  if (search) {
    where.name = { contains: search, mode: 'insensitive' }
  }

  const [groups, total] = await Promise.all([
    prisma.adminGroup.findMany({
      where,
      skip,
      take: limit,
      include: {
        _count: {
          select: { users: true, domains: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.adminGroup.count({ where }),
  ])

  res.json({
    data: groups,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Get group by ID
 * GET /api/groups/:id
 */
groupRouter.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  // Non-super-admins can only see their own group
  if (user.role !== 'SUPER_ADMIN' && id !== user.groupId) {
    throw new AppError(403, 'You do not have permission to view this group')
  }

  const group = await prisma.adminGroup.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      },
      _count: {
        select: { domains: true },
      },
    },
  })

  if (!group) {
    throw new AppError(404, 'Group not found')
  }

  res.json(group)
})

/**
 * Create admin group
 * POST /api/groups
 */
groupRouter.post('/', requireAdmin, validate(createGroupSchema), async (req: Request, res: Response) => {
  const user = req.user!
  const data = req.body

  // Only super admin can create groups
  if (user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only super admin can create groups')
  }

  const group = await prisma.adminGroup.create({
    data: {
      name: data.name,
      description: data.description,
    },
  })

  res.status(201).json({
    status: 'success',
    data: group,
  })
})

/**
 * Update admin group
 * PUT /api/groups/:id
 */
groupRouter.put('/:id', requireAdmin, validate(updateGroupSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!
  const data = req.body

  // Only super admin can update groups
  if (user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only super admin can update groups')
  }

  const group = await prisma.adminGroup.update({
    where: { id },
    data: {
      name: data.name,
      description: data.description,
    },
  })

  res.json({
    status: 'success',
    data: group,
  })
})

/**
 * Delete admin group
 * DELETE /api/groups/:id
 */
groupRouter.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  // Only super admin can delete groups
  if (user.role !== 'SUPER_ADMIN') {
    throw new AppError(403, 'Only super admin can delete groups')
  }

  // Check if group has users or domains
  const [usersCount, domainsCount] = await Promise.all([
    prisma.user.count({ where: { groupId: id } }),
    prisma.domain.count({ where: { groupId: id } }),
  ])

  if (usersCount > 0 || domainsCount > 0) {
    throw new AppError(400, 'Cannot delete group with associated users or domains')
  }

  await prisma.adminGroup.delete({
    where: { id },
  })

  res.json({
    status: 'success',
    message: 'Group deleted successfully',
  })
})
