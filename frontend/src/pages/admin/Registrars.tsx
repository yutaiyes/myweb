import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Power } from 'lucide-react'
import { toast } from 'sonner'

interface Registrar {
  id: string
  name: string
  displayName: string
  website?: string
  isEnabled: boolean
  _count?: { domains: number; accounts: number }
}

interface RegistrarsResponse {
  data: Registrar[]
  pagination: { total: number }
}

export default function Registrars() {
  const { profile } = useAuth()
  const [registrars, setRegistrars] = useState<Registrar[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchRegistrars()
  }, [])

  const fetchRegistrars = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<RegistrarsResponse>('/registrars/list', {
        page: 1,
        limit: 100,
        search,
      })
      setRegistrars(response.data.data)
    } catch {
      toast.error('获取注册商列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEnabled = async (id: string, isEnabled: boolean) => {
    try {
      await apiClient.put(`/registrars/${id}`, { isEnabled: !isEnabled })
      toast.success(`注册商已${!isEnabled ? '启用' : '停用'}`)
      fetchRegistrars()
    } catch {
      toast.error('操作失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">注册商管理</h1>
        {isSuperAdmin && (
          <Button disabled>
            <Plus className="h-4 w-4 mr-2" />
            新增注册商
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={(e) => { e.preventDefault(); fetchRegistrars(); }} className="flex gap-2">
            <Input
              placeholder="搜索注册商..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button type="submit" variant="secondary">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : registrars.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无注册商数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>显示名称</TableHead>
                  <TableHead>网站</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>域名数</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrars.map((registrar) => (
                  <TableRow key={registrar.id}>
                    <TableCell className="font-medium">{registrar.name}</TableCell>
                    <TableCell>{registrar.displayName}</TableCell>
                    <TableCell>
                      {registrar.website && (
                        <a href={registrar.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          {registrar.website}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={registrar.isEnabled ? 'default' : 'secondary'}>
                        {registrar.isEnabled ? '已启用' : '已停用'}
                      </Badge>
                    </TableCell>
                    <TableCell>{registrar._count?.domains || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isSuperAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleEnabled(registrar.id, registrar.isEnabled)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
