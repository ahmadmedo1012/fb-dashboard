import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { fetchStats, fetchRules, fetchBotStatus } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import StatCard from "@/components/stat-card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { MessageSquare, Users, Bot, Activity, AlertTriangle, Inbox, RefreshCw } from "lucide-react"

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <p className="text-destructive font-medium">{error?.message || "فشل تحميل البيانات"}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      {Icon ? <Icon className="h-16 w-16 text-muted-foreground/40" /> : <Inbox className="h-16 w-16 text-muted-foreground/40" />}
      <p className="text-muted-foreground">{message || "لا توجد بيانات"}</p>
    </div>
  )
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["stats"],
    queryFn: fetchStats,
    refetchInterval: 10000,
  })

  const { data: rules, error: rulesError, refetch: refetchRules } = useQuery({
    queryKey: ["rules"],
    queryFn: fetchRules,
  })

  const { data: botStatus, error: botError, refetch: refetchBot } = useQuery({
    queryKey: ["bot-status"],
    queryFn: fetchBotStatus,
    refetchInterval: 10000,
  })

  const chartData = stats?.chart
    ? Object.entries(stats.chart).map(([date, count]) => ({ date, replies: count }))
    : []

  const hasError = statsError || rulesError || botError
  const onRetry = hasError ? () => { refetchStats(); refetchRules(); refetchBot() } : undefined

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">لوحة التحكم</h1>
        <p className="text-sm text-slate-500 mt-1">نظرة عامة على نشاط البوت والصفحة</p>
      </div>

      {hasError ? (
        <ErrorState error={statsError || rulesError || botError} onRetry={onRetry} />
      ) : (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="إجمالي الردود" value={stats?.total_replies ?? 0} icon={MessageSquare} loading={statsLoading} index={0} />
            <StatCard title="ردود اليوم" value={stats?.today_replies ?? 0} icon={Activity} loading={statsLoading} index={1} />
            <StatCard title="المتابعين" value={stats?.fan_count ?? 0} icon={Users} loading={statsLoading} index={2} />
            <StatCard title="القواعد" value={rules?.length ?? 0} icon={Bot} loading={!rules} index={3} />
          </div>

          {/* Chart + Bot Status */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="size-5 text-muted-foreground" />
                    Replies (آخر 7 أيام)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={chartData}>
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "1px solid hsl(var(--border))",
                            background: "hsl(var(--card))",
                          }}
                        />
                        <Line type="monotone" dataKey="replies" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState icon={Inbox} message="لا توجد بيانات كافية للرسم البياني" />
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="size-5 text-muted-foreground" />
                    حالة البوت
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant={botStatus?.running ? "default" : "destructive"}>
                        {botStatus?.running ? "شغال" : "متوقف"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        كل {botStatus?.interval ?? 10} ثانية
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Automatically replies to comments matching configured rules.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  )
}
