import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: "easeOut" },
  }),
}

function StatCard({ title, value, icon: Icon, loading, index = 0 }) {
  if (loading) {
    return (
      <Card className="bg-white shadow-sm rounded-lg border">
        <CardHeader className="flex flex-row items-center gap-3 p-5 pb-0">
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent className="p-5 pt-2">
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      custom={index}
    >
      <Card
        className={cn(
          "bg-white shadow-sm rounded-lg border p-5",
          "transition-shadow duration-200 hover:shadow-md",
        )}
      >
        <CardHeader className="flex flex-row items-center gap-3 p-0 pb-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
            {Icon && <Icon className="size-5 text-slate-600" />}
          </div>
          <CardTitle className="text-sm font-medium text-slate-500">
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default StatCard
