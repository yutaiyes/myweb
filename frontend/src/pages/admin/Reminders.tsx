import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bell, CheckCircle } from 'lucide-react'

interface Reminder {
  id: string
  domainId: string
  domain: { id: string; name: string; expirationDate?: string }
  remindAt: string
  daysBefore: number
  isSent: boolean
  isClosed: boolean
  closedReason?: string
}

interface RemindersResponse {
  data: Reminder[]
  pagination: { total: number }
}

export default function Reminders() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchReminders()
  }, [])

  const fetchReminders = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<RemindersResponse>('/reminders/list', {
        page: 1,
        limit: 50,
        isClosed: false,
      })
      setReminders(response.data.data)
    } catch {
      toast.error('获取提醒列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await apiClient.put(`/reminders/${id}/close`, { reason: '手动关闭' })
      toast.success('提醒已关闭')
      fetchReminders()
    } catch {
      toast.error('操作失败')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  const getDaysRemaining = (expirationDate: string | undefined) => {
    if (!expirationDate) return null
    const days = Math.ceil((new Date(expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">提醒管理</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            即将到期提醒
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无即将到期的域名提醒
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>域名</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead>剩余天数</TableHead>
                  <TableHead>提醒日期</TableHead>
                  <TableHead>提前天数</TableHead>
                  <TableHead>发送状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reminders.map((reminder) => {
                  const daysRemaining = getDaysRemaining(reminder.domain.expirationDate)
                  return (
                    <TableRow key={reminder.id}>
                      <TableCell className="font-medium">{reminder.domain.name}</TableCell>
                      <TableCell>
                        {reminder.domain.expirationDate ? formatDate(reminder.domain.expirationDate) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={daysRemaining && daysRemaining <= 7 ? 'destructive' : 'secondary'}>
                          {daysRemaining !== null ? `${daysRemaining} 天` : '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(reminder.remindAt)}</TableCell>
                      <TableCell>{reminder.daysBefore} 天</TableCell>
                      <TableCell>
                        <Badge variant={reminder.isSent ? 'default' : 'outline'}>
                          {reminder.isSent ? '已发送' : '待发送'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClose(reminder.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          标记已处理
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
