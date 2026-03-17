import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Globe } from 'lucide-react'

interface InitStatus {
  needsInit: boolean
  hasSuperAdmin: boolean
}

export default function Init() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<InitStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    // Check init status
    const checkStatus = async () => {
      try {
        const response = await apiClient.get('/init/check')
        setStatus(response.data)
        if (response.data.hasSuperAdmin) {
          navigate('/login', { replace: true })
        }
      } catch {
        toast.error('无法检查系统状态')
      }
    }
    checkStatus()
  }, [navigate])

  // If user is logged in, try to create super admin
  useEffect(() => {
    if (user && status?.needsInit) {
      createSuperAdmin()
    }
  }, [user, status])

  const createSuperAdmin = async (userName?: string) => {
    setLoading(true)
    try {
      const response = await apiClient.post('/init/super-admin', { name: userName || name })
      toast.success('超级管理员创建成功')
      navigate('/admin', { replace: true })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    // For now, just show a message
    toast.info('请先登录您的账号')
  }

  if (!status) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">检查系统状态...</p>
        </div>
      </div>
    )
  }

  if (status.hasSuperAdmin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Globe className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">系统初始化</CardTitle>
          <CardDescription>创建第一个超级管理员账号</CardDescription>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                已登录为 <strong>{user.email}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="name">您的名字</Label>
                <Input
                  id="name"
                  placeholder="输入您的名字"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createSuperAdmin()}
                disabled={loading}
              >
                {loading ? '创建中...' : '创建超级管理员'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground mb-4">
                请先登录您的账号，然后创建超级管理员
              </p>
              <Button 
                className="w-full" 
                onClick={handleGoogleLogin}
                variant="outline"
              >
                使用邮箱登录
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                登录后将自动创建超级管理员账号
              </p>
              <div className="text-center">
                <a href="/login" className="text-sm text-primary hover:underline">
                  已有账号？前往登录
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
