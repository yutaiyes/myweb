import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { 
  LayoutDashboard, 
  Globe, 
  Building2, 
  Cloud, 
  Users, 
  Shield, 
  Bell,
  LogOut 
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const location = useLocation()

  // Check if user is admin
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
    return <Navigate to="/login" replace />
  }

  const menuItems = [
    { path: '/admin', label: '仪表盘', icon: LayoutDashboard },
    { path: '/admin/domains', label: '域名管理', icon: Globe },
    { path: '/admin/registrars', label: '注册商', icon: Building2 },
    { path: '/admin/cloudflare', label: 'Cloudflare', icon: Cloud },
    { path: '/admin/groups', label: '管理组', icon: Users },
    { path: '/admin/users', label: '用户', icon: Users, superAdminOnly: true },
    { path: '/admin/visibility', label: '展示规则', icon: Shield, superAdminOnly: true },
    { path: '/admin/reminders', label: '提醒', icon: Bell },
  ]

  const filteredMenuItems = menuItems.filter(item => 
    !item.superAdminOnly || profile.role === 'SUPER_ADMIN'
  )

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-4 py-3">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Globe className="h-5 w-5" />
              <span>域名管理</span>
            </Link>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.path
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.path}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{profile.name || profile.email}</div>
                <div className="text-xs text-muted-foreground">{profile.role}</div>
              </div>
              <button
                onClick={signOut}
                className="p-2 hover:bg-accent rounded-md"
                title="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarFooter>
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">
              {filteredMenuItems.find(item => item.path === location.pathname)?.label || '管理后台'}
            </h1>
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
