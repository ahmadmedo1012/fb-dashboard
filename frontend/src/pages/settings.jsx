import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchBotStatus, restartBot, fetchLogs } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { RefreshCw, Terminal, Inbox, AlertTriangle, Plug, Clock, Bot } from "lucide-react"
import { format } from "date-fns"

const levelBadgeClass = {
  INFO: "border-transparent bg-primary/15 text-primary",
  WARNING: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ERROR: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

function EmptyState({ message, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      {Icon ? <Icon className="h-12 w-12 text-muted-foreground/40" /> : <Inbox className="h-12 w-12 text-muted-foreground/40" />}
      <p className="text-muted-foreground">{message || "لا توجد سجلات بعد"}</p>
    </div>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
      <div className="p-3 rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <p className="text-sm text-muted-foreground">{error?.message || "فشل التحميل"}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="mr-1 h-3 w-3" />
        إعادة المحاولة
      </Button>
    </div>
  )
}

export function Settings({ role }) {
  const queryClient = useQueryClient()

  const { data: status, isLoading: statusLoading, isError: statusError, refetch: refetchStatus } = useQuery({
    queryKey: ["bot-status"],
    queryFn: fetchBotStatus,
    refetchInterval: 10000,
  })

  const { data: logs = [], isLoading: logsLoading, isError: logsError, refetch: refetchLogs } = useQuery({
    queryKey: ["logs"],
    queryFn: () => fetchLogs(30),
  })

  const restartMut = useMutation({
    mutationFn: restartBot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bot-status"] })
      toast.success("تم إعادة تشغيل البوت بنجاح")
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">الإعدادات</h1>
        <p className="text-sm text-slate-500 mt-1">إعدادات البوت والمتابعة</p>
      </motion.div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* Bot Status */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">حالة البوت</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-40 rounded-lg" />
                  <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
              ) : statusError ? (
                <ErrorState onRetry={() => refetchStatus()} />
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Badge variant={status?.running ? "default" : "destructive"} className="text-sm px-3 py-1 rounded-full">
                      <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status?.running ? "bg-white" : "bg-white/60"}`} />
                      {status?.running ? "شغال" : "متوقف"}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      الفحص كل: {status?.interval ?? 10} ثانية
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => restartMut.mutate()}
                    disabled={restartMut.isPending || role !== "admin"}
                    className={role !== "admin" ? "opacity-50 cursor-not-allowed" : ""}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1.5 ${restartMut.isPending ? "animate-spin" : ""}`} />
                    {restartMut.isPending ? "جاري..." : "إعادة تشغيل البوت"}
                  </Button>
                  {role !== "admin" && <p className="text-xs text-muted-foreground">متاح للمدير فقط</p>}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Facebook Connection */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Plug className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">اتصال فيسبوك</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {statusLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-lg" />
                </div>
              ) : statusError ? (
                <ErrorState onRetry={() => refetchStatus()} />
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">معرف الصفحة:</span>{" "}
                    <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">مُعد في الإعدادات</code>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">الحالة:</span>
                    <Badge variant="default" className="text-xs rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full mr-1.5 bg-white" />
                      حسب حالة البوت
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bot Logs */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Terminal className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">سجل البوت</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                    <Skeleton className="h-5 w-16 shrink-0 rounded" />
                    <Skeleton className="h-5 w-full rounded" />
                  </div>
                ))}
              </div>
            ) : logsError ? (
              <ErrorState onRetry={() => refetchLogs()} />
            ) : logs.length === 0 ? (
              <EmptyState message="لا توجد سجلات بعد" />
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto" dir="ltr">
                {logs.map((log, i) => (
                  <div
                    key={log.id ?? i}
                    className="flex items-start gap-2 text-sm py-2 px-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0 ${
                        levelBadgeClass[log.level] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-muted-foreground text-xs shrink-0 font-mono" dir="ltr">
                      {log.created_at ? format(new Date(log.created_at), "HH:mm:ss") : "—"}
                    </span>
                    <span className="break-words">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
