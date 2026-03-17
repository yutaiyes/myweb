import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { validate } from '../middleware/validation'
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware'
import { listUsersSchema, updateUserRoleSchema, updateUserGroupSchema } from '../types/user.types'
import { AppError } from '../middleware/errorHandler'

export const userRouter = Router()

/**
 * List users
 * POST /api/users/list
 */
userRouter.post('/list', requireAdmin, validate(listUsersSchema), async (req: Request, res: Response) => {
  const { page, limit, search, role, groupId } = req.body
  const user = req.user!

  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  // Non-super-admins can only see users in their group
  if (user.role !== 'SUPER_ADMIN') {
    where.groupId = user.groupId
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (role) {
    where.role = role
  }

  if (groupId && user.role === 'SUPER_ADMIN') {
    where.groupId = groupId
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        groupId: true,
        group: {
          select: { id: true, name: true },
        },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ])

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * Get current user profile
 * GET /api/users/me
 */
userRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      groupId: true,
      group: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
  })

  res.json(fullUser)
})

/**
 * Get user by ID
 * GET /api/users/:id
 */
userRouter.get('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params
  const user = req.user!

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      groupId: true,
      group: {
        select: { id: true, name: true },
      },
      createdAt: true,
    },
  })

  if (!targetUser) {
    throw new AppError(404, 'User not found')
  }

  // Non-super-admins can only see users in their group
  if (user.role !== 'SUPER_ADMIN' && targetUser.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to view this user')
  }

  res.json(targetUser)
})

/**
 * Update user role (Super Admin only)
 * PUT /api/users/:id/role
 */
userRouter.put('/:id/role', requireSuperAdmin, validate(updateUserRoleSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const { role } = req.body

  const targetUser = await prisma.user.findUnique({
    where: { id },
  })

  if (!targetUser) {
    throw new AppError(404, 'User not found')
  }

  // Prevent removing the last super admin
  if (targetUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
    const superAdminCount = await prisma.user.count({
      where: { role: 'SUPER_ADMIN' },
    })

    if (superAdminCount <= 1) {
      throw new AppError(400, 'Cannot remove the last super admin')
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  })

  res.json({
    status: 'success',
    data: updatedUser,
  })
})

/**
 * Update user group
 * PUT /api/users/:id/group
 */
userRouter.put('/:id/group', requireAdmin, validate(updateUserGroupSchema), async (req: Request, res: Response) => {
  const { id } = req.params
  const { groupId } = req.body
  const user = req.user!

  const targetUser = await prisma.user.findUnique({
    where: { id },
  })

  if (!targetUser) {
    throw new AppError(404, 'User not found')
  }

  // Non-super-admins can only update users in their group
  if (user.role !== 'SUPER_ADMIN' && targetUser.groupId !== user.groupId) {
    throw new AppError(403, 'You do not have permission to update this user')
  }

  // Validate group exists if provided
  if (groupId) {
    const group = await prisma.adminGroup.findUnique({
      where: { id: groupId },
    })

    if (!group) {
      throw new AppError(404, 'Group not found')
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { groupId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      groupId: true,
      group: {
        select: { id: true, name: true },
      },
    },
  })

  res.json({
    status: 'success',
    data: updatedUser,
  })
})
