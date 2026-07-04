import { useState, useEffect, useCallback } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { AnimatePresence, motion } from "framer-motion"
import { fetchMe, logout as apiLogout } from "@/lib/api"
import { Login } from "@/pages/login"
import { Dashboard } from "@/pages/dashboard"
import { Rules } from "@/pages/rules"
import { Replies } from "@/pages/replies"
import { Posts } from "@/pages/posts"
import { Settings } from "@/pages/settings"
import { Users } from "@/pages/users"

const queryClient = new QueryClient()

const pages = {
  dashboard: Dashboard,
  rules: Rules,
  replies: Replies,
  posts: Posts,
  settings: Settings,
  users: Users,
}

function AppInner() {
  const [auth, setAuth] = useState(null) // { username, role }
  const [authLoading, setAuthLoading] = useState(true)
  const [page, setPage] = useState("dashboard")

  useEffect(() => {
    fetchMe()
      .then((u) => setAuth(u))
      .catch(() => setAuth(null))
      .finally(() => setAuthLoading(false))
  }, [])

  const handleLogin = useCallback((res) => {
    setAuth({ username: res.username, role: res.role })
    setPage("dashboard")
  }, [])

  const handleLogout = useCallback(async () => {
    try { await apiLogout() } catch {}
    setAuth(null)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!auth) {
    return <Login onAuth={handleLogin} />
  }

  const Page = pages[page] || Dashboard
  const role = auth.role

  return (
    <ThemeProvider defaultTheme="dark" storageKey="smartbot-theme">
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden" dir="rtl">
          <AppSidebar
            currentPage={page}
            onNavigate={setPage}
            username={auth.username}
            role={role}
            onLogout={handleLogout}
          />
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50 dark:bg-slate-900">
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                <Page role={role} />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
        <Toaster position="top-left" richColors />
      </SidebarProvider>
    </ThemeProvider>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  )
}

export default App
