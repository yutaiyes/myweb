import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Navigate } from 'react-router-dom'
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AnimatedRoutes } from "@/components/AnimatedRoutes"
import { PageTransition } from "@/components/PageTransition"
import { AuthProvider } from './contexts/AuthContext'

// Pages
import Index from "./pages/Index"
import NotFound from "./pages/NotFound"
import Login from "./pages/Login"
import Init from "./pages/Init"
import Domains from "./pages/Domains"
import DomainDetail from "./pages/DomainDetail"

// Admin Pages
import AdminLayout from "./components/layout/AdminLayout"
import Dashboard from "./pages/admin/Dashboard"
import AdminDomains from "./pages/admin/Domains"
import DomainForm from "./pages/admin/DomainForm"
import Registrars from "./pages/admin/Registrars"
import Cloudflare from "./pages/admin/Cloudflare"
import Groups from "./pages/admin/Groups"
import Users from "./pages/admin/Users"
import Visibility from "./pages/admin/Visibility"
import Reminders from "./pages/admin/Reminders"

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <AnimatedRoutes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/domains" replace />} />
              <Route path="/domains" data-genie-title="域名列表" data-genie-key="Domains" element={<PageTransition transition="slide-up"><Domains /></PageTransition>} />
              <Route path="/domains/:id" data-genie-title="域名详情" data-genie-key="DomainDetail" element={<PageTransition transition="slide-up"><DomainDetail /></PageTransition>} />
              
              {/* Auth routes */}
              <Route path="/login" data-genie-title="登录" data-genie-key="Login" element={<PageTransition transition="fade"><Login /></PageTransition>} />
              <Route path="/init" data-genie-title="初始化" data-genie-key="Init" element={<PageTransition transition="fade"><Init /></PageTransition>} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index data-genie-title="仪表盘" data-genie-key="Dashboard" element={<PageTransition transition="slide-fade"><Dashboard /></PageTransition>} />
                <Route path="domains" data-genie-title="域名管理" data-genie-key="AdminDomains" element={<PageTransition transition="slide-fade"><AdminDomains /></PageTransition>} />
                <Route path="domains/new" data-genie-title="新增域名" data-genie-key="DomainNew" element={<PageTransition transition="slide-fade"><DomainForm /></PageTransition>} />
                <Route path="domains/:id" data-genie-title="编辑域名" data-genie-key="DomainEdit" element={<PageTransition transition="slide-fade"><DomainForm /></PageTransition>} />
                <Route path="registrars" data-genie-title="注册商管理" data-genie-key="Registrars" element={<PageTransition transition="slide-fade"><Registrars /></PageTransition>} />
                <Route path="cloudflare" data-genie-title="Cloudflare配置" data-genie-key="Cloudflare" element={<PageTransition transition="slide-fade"><Cloudflare /></PageTransition>} />
                <Route path="groups" data-genie-title="管理组" data-genie-key="Groups" element={<PageTransition transition="slide-fade"><Groups /></PageTransition>} />
                <Route path="users" data-genie-title="用户管理" data-genie-key="Users" element={<PageTransition transition="slide-fade"><Users /></PageTransition>} />
                <Route path="visibility" data-genie-title="展示规则" data-genie-key="Visibility" element={<PageTransition transition="slide-fade"><Visibility /></PageTransition>} />
                <Route path="reminders" data-genie-title="提醒管理" data-genie-key="Reminders" element={<PageTransition transition="slide-fade"><Reminders /></PageTransition>} />
              </Route>
              
              {/* Catch-all route */}
              <Route path="*" data-genie-key="NotFound" data-genie-title="Not Found" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
            </AnimatedRoutes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
