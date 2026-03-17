import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Edit, Eye } from 'lucide-react'
import { toast } from 'sonner'

interface Domain {
  id: string
  name: string
  status: string
  expirationDate?: string
  registrar?: { id: string; name: string; displayName: string }
  group?: { id: string; name: string }
  _count?: { dnsRecords: number; reminders: number }
}

interface DomainsResponse {
  data: Domain[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function AdminDomains() {
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchDomains()
  }, [page])

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<DomainsResponse>('/domains/list', {
        page,
        limit: 20,
        search,
      })
      setDomains(response.data.data)
      setTotalPages(response.data.pagination.totalPages)
    } catch {
      toast.error('获取域名列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchDomains()
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      EXPIRING: 'secondary',
      EXPIRED: 'destructive',
    }
    const labels: Record<string, string> = {
      ACTIVE: '正常',
      EXPIRING: '即将到期',
      EXPIRED: '已过期',
    }
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>
  }

  const formatDate = (date: string | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">域名管理</h1>
        <Link to="/admin/domains/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            新增域名
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              placeholder="搜索域名..."
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
          ) : domains.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无域名数据
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>域名</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>注册商</TableHead>
                  <TableHead>DNS记录</TableHead>
                  <TableHead>提醒</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.name}</TableCell>
                    <TableCell>{getStatusBadge(domain.status)}</TableCell>
                    <TableCell>{formatDate(domain.expirationDate)}</TableCell>
                    <TableCell>{domain.registrar?.displayName || '-'}</TableCell>
                    <TableCell>{domain._count?.dnsRecords || 0}</TableCell>
                    <TableCell>{domain._count?.reminders || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/domains/${domain.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to={`/admin/domains/${domain.id}`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一页
              </Button>
              <span className="flex items-center px-4 text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                下一页
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
