import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  Bot,
  MessageSquareReply,
  FileText,
  Settings,
  Users,
  Moon,
  Sun,
  LogOut,
} from "lucide-react"

const allItems = [
  { key: "dashboard", label: "لوحة التحكم", icon: LayoutDashboard },
  { key: "rules", label: "القواعد", icon: Bot },
  { key: "replies", label: "الردود", icon: MessageSquareReply },
  { key: "posts", label: "المنشورات", icon: FileText },
  { key: "settings", label: "الإعدادات", icon: Settings },
  { key: "users", label: "المستخدمين", icon: Users, adminOnly: true },
]

export function AppSidebar({ currentPage, onNavigate, username, role, onLogout }) {
  const { theme, setTheme } = useTheme()
  const items = allItems.filter((i) => !i.adminOnly || role === "admin")

  return (
    <Sidebar collapsible="icon" className="shrink-0 border-l border-slate-700/50 bg-slate-900">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <LayoutDashboard className="h-6 w-6 text-white" />
          <span className="font-bold text-lg text-slate-100 group-data-[collapsible=icon]:hidden">
            SmartBot
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = currentPage === item.key
                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => onNavigate(item.key)}
                      tooltip={item.label}
                      className={
                        active
                          ? "bg-blue-500/10 text-blue-400 border-r-2 border-r-blue-500 rounded-none p-2"
                          : "text-slate-400 hover:text-white hover:bg-slate-800 rounded-md p-2"
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 space-y-2">
          {username && (
            <div className="px-2 text-xs text-slate-500 group-data-[collapsible=icon]:hidden truncate">
              {username} · {role === "admin" ? "مدير" : role === "editor" ? "محرر" : "مشاهد"}
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            {onLogout && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-slate-400 hover:text-red-400 hover:bg-red-900/20"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}
            <SidebarTrigger className="text-slate-400 hover:text-white hover:bg-slate-800" />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
