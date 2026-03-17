import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface User {
  id: string
  email: string
  name: string
  role: string
  group?: { id: string; name: string }
  createdAt: string
}

interface UsersResponse {
  data: User[]
  pagination: { total: number }
}

export default function Users() {
  const { profile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const isSuperAdmin = profile?.role === 'SUPER_ADMIN'

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<UsersResponse>('/users/list', {
        page: 1,
        limit: 100,
        search,
      })
      setUsers(response.data.data)
    } catch {
      toast.error('获取用户列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await apiClient.put(`/users/${userId}/role`, { role })
      toast.success('角色更新成功')
      fetchUsers()
    } catch {
      toast.error('更新失败')
    }
  }

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      SUPER_ADMIN: 'destructive',
      ADMIN: 'default',
      VIEWER: 'secondary',
    }
    const labels: Record<string, string> = {
      SUPER_ADMIN: '超级管理员',
      ADMIN: '管理员',
      VIEWER: '查看者',
    }
    return <Badge variant={variants[role] || 'outline'}>{labels[role] || role}</Badge>
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={(e) => { e.preventDefault(); fetchUsers(); }} className="flex gap-2">
            <Input
              placeholder="搜索用户..."
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
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无用户数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>邮箱</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>管理组</TableHead>
                  <TableHead>创建时间</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">操作</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.name || '-'}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{user.group?.name || '-'}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="VIEWER">查看者</SelectItem>
                            <SelectItem value="ADMIN">管理员</SelectItem>
                            <SelectItem value="SUPER_ADMIN">超级管理员</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
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
