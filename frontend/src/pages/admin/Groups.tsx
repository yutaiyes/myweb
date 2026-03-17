import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Edit, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface AdminGroup {
  id: string
  name: string
  description?: string
  _count?: { users: number; domains: number }
}

interface GroupsResponse {
  data: AdminGroup[]
  pagination: { total: number }
}

export default function Groups() {
  const { profile } = useAuth()
  const [groups, setGroups] = useState<AdminGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AdminGroup | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchGroups()
  }, [])

  const fetchGroups = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<GroupsResponse>('/groups/list', {
        page: 1,
        limit: 100,
        search,
      })
      setGroups(response.data.data)
    } catch {
      toast.error('获取管理组列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (group?: AdminGroup) => {
    setEditingGroup(group || null)
    setFormData({
      name: group?.name || '',
      description: group?.description || '',
    })
    setShowDialog(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingGroup) {
        await apiClient.put(`/groups/${editingGroup.id}`, formData)
        toast.success('管理组更新成功')
      } else {
        await apiClient.post('/groups', formData)
        toast.success('管理组创建成功')
      }
      setShowDialog(false)
      fetchGroups()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此管理组吗？')) return
    try {
      await apiClient.delete(`/groups/${id}`)
      toast.success('管理组删除成功')
      fetchGroups()
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理组管理</h1>
        {isSuperAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            新增管理组
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={(e) => { e.preventDefault(); fetchGroups(); }} className="flex gap-2">
            <Input
              placeholder="搜索管理组..."
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
          ) : groups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无管理组数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>成员数</TableHead>
                  <TableHead>域名数</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.description || '-'}</TableCell>
                    <TableCell>{group._count?.users || 0}</TableCell>
                    <TableCell>{group._count?.domains || 0}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(group)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(group.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGroup ? '编辑管理组' : '新增管理组'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                取消
              </Button>
              <Button type="submit">保存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
