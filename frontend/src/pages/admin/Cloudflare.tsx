import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Save, Cloud } from 'lucide-react'

interface CloudflareConfig {
  id: string
  accountId?: string
  isEnabled: boolean
  updatedAt: string
}

export default function Cloudflare() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState<CloudflareConfig | null>(null)

  const [formData, setFormData] = useState({
    apiToken: '',
    accountId: '',
    isEnabled: true,
  })

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/cloudflare/config')
      setConfig(response.data)
      setFormData({
        apiToken: '',
        accountId: response.data.accountId || '',
        isEnabled: response.data.isEnabled ?? true,
      })
    } catch {
      // Handle error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isSuperAdmin) return

    setSaving(true)
    try {
      await apiClient.put('/cloudflare/config', formData)
      toast.success('配置保存成功')
      fetchConfig()
    } catch {
      toast.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    try {
      const response = await apiClient.post('/cloudflare/test')
      toast.success(response.data.message)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '连接失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cloudflare 配置</h1>
        {config?.configured && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Cloud className="h-4 w-4" />
            <span>已配置</span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API 配置</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="apiToken">API Token</Label>
                  <Input
                    id="apiToken"
                    type="password"
                    value={formData.apiToken}
                    onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                    placeholder={config?.configured ? '已配置（输入以更新）' : '输入 API Token'}
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-xs text-muted-foreground">
                    在 Cloudflare 控制台创建 API Token，需要 Zone 相关权限
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountId">Account ID（可选）</Label>
                  <Input
                    id="accountId"
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    placeholder="输入 Account ID"
                    disabled={!isSuperAdmin}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用</Label>
                  <p className="text-sm text-muted-foreground">启用 Cloudflare 同步功能</p>
                </div>
                <Switch
                  checked={formData.isEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
                  disabled={!isSuperAdmin}
                />
              </div>

              <div className="flex gap-4">
                {isSuperAdmin && (
                  <>
                    <Button type="submit" disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? '保存中...' : '保存配置'}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleTest}>
                      测试连接
                    </Button>
                  </>
                )}
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
