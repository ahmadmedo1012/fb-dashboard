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
  Moon,
  Sun,
} from "lucide-react"

const items = [
  { key: "dashboard", label: "الإحصائيات", icon: LayoutDashboard },
  { key: "rules", label: "القواعد", icon: Bot },
  { key: "replies", label: "سجل الردود", icon: MessageSquareReply },
  { key: "posts", label: "المنشورات", icon: FileText },
  { key: "settings", label: "الإعدادات", icon: Settings },
]

export function AppSidebar({ currentPage, onNavigate }) {
  const { theme, setTheme } = useTheme()

  return (
    <Sidebar collapsible="icon" className="shrink-0">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <Bot className="h-6 w-6 text-sidebar-primary" />
          <span className="font-bold text-lg text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            SmartBot
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={currentPage === item.key}
                    onClick={() => onNavigate(item.key)}
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center justify-between p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <SidebarTrigger />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
