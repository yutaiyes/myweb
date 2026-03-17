import { Router, Request, Response } from 'express'
import { prisma } from '../config/database'
import { requireAuth, requireAdmin, requireSuperAdmin } from '../middleware/auth.middleware'
import { AppError } from '../middleware/errorHandler'

export const cloudflareRouter = Router()

/**
 * Get Cloudflare configuration
 * GET /api/cloudflare/config
 */
cloudflareRouter.get('/config', requireAdmin, async (_req: Request, res: Response) => {
  const config = await prisma.cloudflareConfig.findFirst()

  if (!config) {
    res.json({
      configured: false,
      isEnabled: false,
    })
    return
  }

  // Don't expose the actual API token
  res.json({
    configured: true,
    id: config.id,
    accountId: config.accountId,
    isEnabled: config.isEnabled,
    updatedAt: config.updatedAt,
  })
})

/**
 * Update Cloudflare configuration (Super Admin only)
 * PUT /api/cloudflare/config
 */
cloudflareRouter.put('/config', requireSuperAdmin, async (req: Request, res: Response) => {
  const { apiToken, accountId, isEnabled } = req.body

  if (!apiToken) {
    throw new AppError(400, 'API token is required')
  }

  // Upsert config (there should only be one)
  const existingConfig = await prisma.cloudflareConfig.findFirst()

  let config
  if (existingConfig) {
    config = await prisma.cloudflareConfig.update({
      where: { id: existingConfig.id },
      data: {
        apiToken,
        accountId,
        isEnabled: isEnabled ?? true,
      },
    })
  } else {
    config = await prisma.cloudflareConfig.create({
      data: {
        apiToken,
        accountId,
        isEnabled: isEnabled ?? true,
      },
    })
  }

  res.json({
    status: 'success',
    data: {
      id: config.id,
      accountId: config.accountId,
      isEnabled: config.isEnabled,
      updatedAt: config.updatedAt,
    },
  })
})

/**
 * Test Cloudflare connection
 * POST /api/cloudflare/test
 */
cloudflareRouter.post('/test', requireSuperAdmin, async (_req: Request, res: Response) => {
  const config = await prisma.cloudflareConfig.findFirst()

  if (!config || !config.apiToken) {
    throw new AppError(400, 'Cloudflare is not configured')
  }

  try {
    // Test the API token by fetching zones
    const response = await fetch('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json() as { success: boolean; result?: unknown[] }

    if (data.success) {
      res.json({
        status: 'success',
        message: 'Cloudflare connection successful',
        zonesCount: data.result?.length || 0,
      })
    } else {
      throw new AppError(400, 'Failed to connect to Cloudflare')
    }
  } catch (error) {
    throw new AppError(400, 'Failed to connect to Cloudflare')
  }
})

/**
 * List Cloudflare zones
 * POST /api/cloudflare/zones
 */
cloudflareRouter.post('/zones', requireAdmin, async (_req: Request, res: Response) => {
  const config = await prisma.cloudflareConfig.findFirst()

  if (!config || !config.apiToken || !config.isEnabled) {
    throw new AppError(400, 'Cloudflare is not configured or disabled')
  }

  try {
    const response = await fetch('https://api.cloudflare.com/client/v4/zones', {
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json() as { 
      success: boolean
      result?: Array<{ id: string; name: string; status: string }>
    }

    if (data.success) {
      res.json({
        status: 'success',
        data: data.result?.map((zone) => ({
          id: zone.id,
          name: zone.name,
          status: zone.status,
        })) || [],
      })
    } else {
      throw new AppError(400, 'Failed to fetch zones from Cloudflare')
    }
  } catch {
    throw new AppError(400, 'Failed to fetch zones from Cloudflare')
  }
})
