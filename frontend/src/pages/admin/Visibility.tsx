import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Shield, Eye, EyeOff } from 'lucide-react'

interface VisibilityRule {
  id: string
  domainId: string
  domain: { id: string; name: string }
  isHidden: boolean
  createdBy: string
  isOverride: boolean
  overrideBy: string | null
  createdAt: string
}

interface VisibilityResponse {
  data: VisibilityRule[]
  pagination: { total: number }
}

export default function Visibility() {
  const [rules, setRules] = useState<VisibilityRule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRules()
  }, [])

  const fetchRules = async () => {
    setLoading(true)
    try {
      const response = await apiClient.post<VisibilityResponse>('/visibility/list', {
        page: 1,
        limit: 100,
      })
      setRules(response.data.data)
    } catch {
      toast.error('获取规则列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleOverride = async (ruleId: string, isHidden: boolean) => {
    try {
      await apiClient.put('/visibility/override', {
        ruleId,
        isHidden,
      })
      toast.success('裁决成功')
      fetchRules()
    } catch {
      toast.error('操作失败')
    }
  }

  const handleRemoveOverride = async (ruleId: string) => {
    try {
      await apiClient.delete(`/visibility/override/${ruleId}`)
      toast.success('已移除裁决')
      fetchRules()
    } catch {
      toast.error('操作失败')
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">公开展示规则</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            超级管理员裁决
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            管理员可以设置域名的隐藏规则。超级管理员可以进行最终裁决，强制公开或隐藏域名。
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">加载中...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">暂无规则数据</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>域名</TableHead>
                  <TableHead>设置状态</TableHead>
                  <TableHead>是否裁决</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">{rule.domain.name}</TableCell>
                    <TableCell>
                      <Badge variant={rule.isHidden ? 'destructive' : 'default'}>
                        {rule.isHidden ? '隐藏' : '显示'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {rule.isOverride ? (
                        <Badge variant="outline">已裁决</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(rule.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {rule.isOverride ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveOverride(rule.id)}
                          >
                            移除裁决
                          </Button>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOverride(rule.id, false)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              强制公开
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOverride(rule.id, true)}
                            >
                              <EyeOff className="h-4 w-4 mr-1" />
                              强制隐藏
                            </Button>
                          </>
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
