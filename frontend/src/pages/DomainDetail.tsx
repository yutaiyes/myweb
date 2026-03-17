import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Globe, Edit, Trash } from 'lucide-react'
import { toast } from 'sonner'

interface DnsRecord {
  id: string
  recordType: string
  name: string
  content: string
  ttl: number
  priority?: number
  proxied: boolean
}

interface Domain {
  id: string
  name: string
  status: string
  expirationDate?: string
  registrationDate?: string
  registrar?: { id: string; name: string; displayName: string }
  group?: { id: string; name: string }
  notes?: string
  dnsRecords: DnsRecord[]
}

export default function DomainDetail() {
  const { id } = useParams<{ id: string }>()
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [domain, setDomain] = useState<Domain | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchDomain()
    }
  }, [id])

  const fetchDomain = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/domains/${id}`)
      setDomain(response.data)
    } catch {
      toast.error('获取域名详情失败')
      navigate('/domains')
    } finally {
      setLoading(false)
    }
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
    return days > 0 ? `${days} 天` : '已过期'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  if (!domain) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">域名不存在</p>
      </div>
    )
  }

  const canEdit = profile && (profile.role === 'ADMIN' || profile.role === 'SUPER_ADMIN')

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="container flex h-14 items-center px-4">
          <Link to="/domains" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span>返回列表</span>
          </Link>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{domain.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {getStatusBadge(domain.status)}
                {user && domain.expirationDate && (
                  <span className="text-sm text-muted-foreground">
                    剩余 {getDaysRemaining(domain.expirationDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Link to={`/admin/domains/${domain.id}`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  编辑
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">注册商</p>
                  <p className="font-medium">{domain.registrar?.displayName || '-'}</p>
                </div>
                {user && (
                  <div>
                    <p className="text-sm text-muted-foreground">注册时间</p>
                    <p className="font-medium">{formatDate(domain.registrationDate)}</p>
                  </div>
                )}
                {user && (
                  <div>
                    <p className="text-sm text-muted-foreground">到期时间</p>
                    <p className="font-medium">{formatDate(domain.expirationDate)}</p>
                  </div>
                )}
              </div>
              {domain.group && user && (
                <div>
                  <p className="text-sm text-muted-foreground">管理组</p>
                  <p className="font-medium">{domain.group.name}</p>
                </div>
              )}
              {domain.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">备注</p>
                  <p className="text-sm">{domain.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">DNS 解析记录</CardTitle>
            </CardHeader>
            <CardContent>
              {domain.dnsRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">暂无解析记录</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>类型</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead>值</TableHead>
                      <TableHead>TTL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domain.dnsRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <Badge variant="outline">{record.recordType}</Badge>
                        </TableCell>
                        <TableCell>{record.name || '@'}</TableCell>
                        <TableCell className="font-mono text-sm">{record.content}</TableCell>
                        <TableCell>{record.ttl}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
