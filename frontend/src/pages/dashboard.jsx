import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { fetchStats, fetchRules, fetchBotStatus } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { MessageSquare, Users, Bot, Activity, AlertTriangle, Inbox, RefreshCw } from "lucide-react"

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.3 } }),
}

// ponytail: gradients are CSS only, no additional dep. pulse uses tailwind animate-pulse.
const gradientMap = {
  MessageSquare: "from-blue-500/20 via-blue-500/10 to-transparent",
  Activity: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  Users: "from-amber-500/20 via-amber-500/10 to-transparent",
  Bot: "from-purple-500/20 via-purple-500/10 to-transparent",
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <p className="text-destructive font-medium">{error?.message || "حدث خطأ أثناء تحميل البيانات"}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 ml-2" />
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

function StatCard({ title, value, icon: Icon, loading, index }) {
  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={index}>
      <Card className={`relative overflow-hidden hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm bg-white/70 dark:bg-black/70`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientMap[Icon.name] || "from-primary/10 to-transparent"} pointer-events-none`} />
        <CardHeader className="flex flex-row items-center justify-between pb-2 relative">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="relative">
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function Dashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["stats"], queryFn: fetchStats, refetchInterval: 10000,
  })
  const { data: rules, error: rulesError, refetch: refetchRules } = useQuery({
    queryKey: ["rules"], queryFn: fetchRules,
  })
  const { data: botStatus, error: botError, refetch: refetchBot } = useQuery({
    queryKey: ["bot-status"], queryFn: fetchBotStatus, refetchInterval: 10000,
  })

  const chartData = stats?.chart
    ? Object.entries(stats.chart).map(([date, count]) => ({ date, replies: count }))
    : []

  const hasError = statsError || rulesError || botError
  const onRetry = hasError ? () => { refetchStats(); refetchRules(); refetchBot() } : undefined

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
        <p className="text-muted-foreground mt-1">نظرة عامة على نشاط البوت والصفحة</p>
      </div>

      {hasError ? (
        <ErrorState error={statsError || rulesError || botError} onRetry={onRetry} />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="إجمالي الردود" value={stats?.total_replies ?? 0} icon={MessageSquare} loading={statsLoading} index={0} />
            <StatCard title="ردود اليوم" value={stats?.today_replies ?? 0} icon={Activity} loading={statsLoading} index={1} />
            <StatCard title="عدد المتابعين" value={stats?.fan_count ?? 0} icon={Users} loading={statsLoading} index={2} />
            <StatCard title="القواعد" value={rules?.length ?? 0} icon={Bot} loading={!rules} index={3} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="backdrop-blur-sm bg-white/70 dark:bg-black/70">
              <CardHeader>
                <CardTitle className="text-lg">الردود خلال آخر 7 أيام</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="replies" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState icon={Inbox} message="لا توجد بيانات كافية" />
                )}
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-white/70 dark:bg-black/70">
              <CardHeader>
                <CardTitle className="text-lg">حالة البوت</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant={botStatus?.running ? "default" : "destructive"} className={`text-sm px-3 py-1 ${botStatus?.running ? "animate-pulse" : ""}`}>
                    {botStatus?.running ? "شغال" : "متوقف"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    فحص كل {botStatus?.interval ?? 10} ثواني
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  البوت يرد تلقائياً على التعليقات المتطابقة مع القواعد المضافة
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
