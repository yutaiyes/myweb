import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { ArrowLeft, Save } from 'lucide-react'

interface Registrar {
  id: string
  name: string
  displayName: string
}

interface AdminGroup {
  id: string
  name: string
}

export default function DomainForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(false)
  const [registrars, setRegistrars] = useState<Registrar[]>([])
  const [groups, setGroups] = useState<AdminGroup[]>([])

  const [formData, setFormData] = useState({
    name: '',
    registrarId: '',
    expirationDate: '',
    registrationDate: '',
    groupId: '',
    reminderDays: 30,
    notes: '',
  })

  useEffect(() => {
    fetchRegistrars()
    fetchGroups()
    if (id) {
      fetchDomain()
    }
  }, [id])

  const fetchRegistrars = async () => {
    try {
      const response = await apiClient.post('/registrars/list', { limit: 100 })
      setRegistrars(response.data.data)
    } catch {
      // Handle error
    }
  }

  const fetchGroups = async () => {
    try {
      const response = await apiClient.post('/groups/list', { limit: 100 })
      setGroups(response.data.data)
    } catch {
      // Handle error
    }
  }

  const fetchDomain = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/domains/${id}`)
      const domain = response.data
      setFormData({
        name: domain.name,
        registrarId: domain.registrarId || '',
        expirationDate: domain.expirationDate ? domain.expirationDate.split('T')[0] : '',
        registrationDate: domain.registrationDate ? domain.registrationDate.split('T')[0] : '',
        groupId: domain.groupId || '',
        reminderDays: domain.reminderDays || 30,
        notes: domain.notes || '',
      })
    } catch {
      toast.error('获取域名信息失败')
      navigate('/admin/domains')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name: formData.name,
        registrarId: formData.registrarId || null,
        expirationDate: formData.expirationDate ? new Date(formData.expirationDate).toISOString() : null,
        registrationDate: formData.registrationDate ? new Date(formData.registrationDate).toISOString() : null,
        groupId: formData.groupId || null,
        reminderDays: formData.reminderDays,
        notes: formData.notes || null,
      }

      if (isEdit) {
        await apiClient.put(`/domains/${id}`, data)
        toast.success('域名更新成功')
      } else {
        await apiClient.post('/domains', data)
        toast.success('域名创建成功')
      }
      navigate('/admin/domains')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } }
      toast.error(err.response?.data?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/admin/domains')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回
        </Button>
        <h1 className="text-2xl font-bold">{isEdit ? '编辑域名' : '新增域名'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? '编辑域名信息' : '填写域名信息'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">域名名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="example.com"
                  required
                  disabled={isEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrar">注册商</Label>
                <Select
                  value={formData.registrarId}
                  onValueChange={(value) => setFormData({ ...formData, registrarId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择注册商" />
                  </SelectTrigger>
                  <SelectContent>
                    {registrars.map((registrar) => (
                      <SelectItem key={registrar.id} value={registrar.id}>
                        {registrar.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="registrationDate">注册时间</Label>
                <Input
                  id="registrationDate"
                  type="date"
                  value={formData.registrationDate}
                  onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expirationDate">到期时间</Label>
                <Input
                  id="expirationDate"
                  type="date"
                  value={formData.expirationDate}
                  onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groupId">管理组</Label>
                <Select
                  value={formData.groupId}
                  onValueChange={(value) => setFormData({ ...formData, groupId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择管理组" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderDays">提醒天数</Label>
                <Input
                  id="reminderDays"
                  type="number"
                  min={1}
                  max={90}
                  value={formData.reminderDays}
                  onChange={(e) => setFormData({ ...formData, reminderDays: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="域名备注信息..."
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? '保存中...' : '保存'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/admin/domains')}>
                取消
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
