import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster } from "sonner"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { AnimatePresence, motion } from "framer-motion"
import { Dashboard } from "@/pages/dashboard"
import { Rules } from "@/pages/rules"
import { Replies } from "@/pages/replies"
import { Posts } from "@/pages/posts"
import { Settings } from "@/pages/settings"

const queryClient = new QueryClient()

const pages = {
  dashboard: Dashboard,
  rules: Rules,
  replies: Replies,
  posts: Posts,
  settings: Settings,
}

function App() {
  const [page, setPage] = useState("dashboard")
  const Page = pages[page] || Dashboard

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="smartbot-theme">
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden" dir="rtl">
            <AppSidebar currentPage={page} onNavigate={setPage} />
            <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-br from-background via-background to-muted/30 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-l from-primary/50 via-primary/20 to-transparent" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={page}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <Page />
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
          <Toaster position="top-left" richColors />
        </SidebarProvider>
        <style>{`button{cursor:pointer;transition:scale .15s}button:active{scale:.95}`}</style>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
