import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Plus, Globe } from 'lucide-react'
import { toast } from 'sonner'

interface Domain {
  id: string
  name: string
  status: string
  expirationDate?: string
  registrar?: { displayName: string }
  createdAt: string
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

export default function Domains() {
  const { user, profile } = useAuth()
  const [domains, setDomains] = useState<Domain[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchDomains()
  }, [page])

  const fetchDomains = async () => {
    setLoading(true)
    try {
      const endpoint = user ? '/domains/list' : '/domains/public'
      const response = await apiClient.post<DomainsResponse>(endpoint, {
        page,
        limit: 20,
        search,
      })
      setDomains(response.data.data)
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

  const getDaysRemaining = (expirationDate: string | undefined) => {
    if (!expirationDate) return null
    const days = Math.ceil((new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days > 0 ? `${days}天` : '已过期'
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Globe className="h-5 w-5" />
            <span>域名管理系统</span>
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {(profile?.role === 'ADMIN' || profile?.role === 'SUPER_ADMIN') && (
                  <Link to="/admin">
                    <Button variant="outline" size="sm">
                      管理后台
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  登录
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>域名列表</CardTitle>
            {profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN') && (
              <Link to="/admin/domains/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  新增域名
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
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
                    {user && <TableHead>到期时间</TableHead>}
                    {user && <TableHead>剩余天数</TableHead>}
                    <TableHead>注册商</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <Link to={`/domains/${domain.id}`} className="hover:underline">
                          {domain.name}
                        </Link>
                      </TableCell>
                      <TableCell>{getStatusBadge(domain.status)}</TableCell>
                      {user && <TableCell>{formatDate(domain.expirationDate)}</TableCell>}
                      {user && <TableCell>{getDaysRemaining(domain.expirationDate)}</TableCell>}
                      <TableCell>{domain.registrar?.displayName || '-'}</TableCell>
                      <TableCell>
                        <Link to={`/domains/${domain.id}`}>
                          <Button variant="ghost" size="sm">
                            查看
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
