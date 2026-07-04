import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchBotStatus, restartBot, fetchLogs } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { RefreshCw, Activity, Server, Terminal } from "lucide-react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"

export function Settings() {
  const queryClient = useQueryClient()
  const { data: status, isLoading: statusLoading } = useQuery({ queryKey: ["bot-status"], queryFn: fetchBotStatus, refetchInterval: 10000 })
  const { data: logs = [], isLoading: logsLoading } = useQuery({ queryKey: ["logs"], queryFn: () => fetchLogs(30) })

  const restartMut = useMutation({
    mutationFn: restartBot,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bot-status"] }); toast.success("تم إعادة تشغيل البوت") },
    onError: (e) => toast.error(e.message),
  })

  const levelColors = {
    INFO: "default",
    ERROR: "destructive",
    WARNING: "secondary",
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إعدادات البوت والمتابعة</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              <CardTitle className="text-lg">حالة البوت</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {statusLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Badge variant={status?.running ? "default" : "destructive"} className="text-sm px-3 py-1">
                    {status?.running ? "🟢 شغال" : "🔴 متوقف"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    دورة الفحص: كل {status?.interval ?? 10} ثواني
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => restartMut.mutate()}
                  disabled={restartMut.isPending}
                >
                  <RefreshCw className={`ml-2 h-4 w-4 ${restartMut.isPending ? "animate-spin" : ""}`} />
                  {restartMut.isPending ? "جاري..." : "إعادة تشغيل البوت"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle className="text-lg">اتصال فيسبوك</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>معرف الصفحة: <code className="px-2 py-0.5 bg-muted rounded text-xs">1235690416285843</code></p>
            <p>تم ربط الصفحة بنجاح ✅</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            <CardTitle className="text-lg">سجل البوت</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-6 w-full" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">لا توجد سجلات بعد</p>
          ) : (
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-sm py-1.5 border-b border-border/50 last:border-0">
                  <Badge variant={(levelColors[log.level] || "default")} className="text-[10px] px-1.5 py-0 shrink-0">
                    {log.level}
                  </Badge>
                  <span className="text-muted-foreground text-xs shrink-0">
                    {log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "-"}
                  </span>
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
