import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Globe, Building2, Users, Bell, AlertTriangle } from 'lucide-react'

interface DashboardStats {
  totalDomains: number
  activeDomains: number
  expiringDomains: number
  expiredDomains: number
  totalRegistrars: number
  totalUsers: number
  upcomingReminders: number
}

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Fetch domains count
      const domainsResponse = await apiClient.post('/domains/list', { limit: 1 })
      const remindersResponse = await apiClient.get('/reminders/upcoming')
      
      setStats({
        totalDomains: domainsResponse.data.pagination.total,
        activeDomains: 0,
        expiringDomains: 0,
        expiredDomains: 0,
        totalRegistrars: 0,
        totalUsers: 0,
        upcomingReminders: remindersResponse.data.count,
      })
    } catch {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: '域名总数',
      value: stats?.totalDomains || 0,
      icon: Globe,
      color: 'text-blue-500',
    },
    {
      title: '即将到期',
      value: stats?.upcomingReminders || 0,
      icon: AlertTriangle,
      color: 'text-yellow-500',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <p className="text-muted-foreground">
          欢迎，{profile?.name || profile?.email}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">加载中...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {stats?.upcomingReminders && stats.upcomingReminders > 0 && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-5 w-5" />
                  到期提醒
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  有 <strong>{stats.upcomingReminders}</strong> 个域名即将到期，请及时处理。
                </p>
                <Link to="/admin/reminders">
                  <Button variant="outline" className="mt-4">
                    查看提醒
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">快捷操作</CardTitle>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Link to="/admin/domains/new">
                  <Button>新增域名</Button>
                </Link>
                <Link to="/admin/registrars">
                  <Button variant="outline">管理注册商</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
