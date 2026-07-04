import { useState } from "react"
import { motion } from "framer-motion"
import { useQuery } from "@tanstack/react-query"
import { fetchReplies } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { Search, Download, AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { toast } from "sonner"

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
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

function EmptyState({ search }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <Inbox className="h-12 w-12 text-muted-foreground" />
      <p className="text-muted-foreground">
        {search ? "لا توجد نتائج للبحث" : "لا توجد ردود بعد"}
      </p>
    </div>
  )
}

export function Replies() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const perPage = 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["replies", page],
    queryFn: () => fetchReplies(page, perPage),
  })

  const replies = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / perPage)

  const filtered = search
    ? replies.filter((r) => r.comment_text?.includes(search) || r.commenter_name?.includes(search) || r.reply_text?.includes(search))
    : replies

  function exportCSV() {
    const header = "commenter,comment,reply,date\n"
    const rows = replies.map((r) =>
      `"${r.commenter_name}","${(r.comment_text || "").replace(/"/g, '""')}","${(r.reply_text || "").replace(/"/g, '""')}","${r.created_at}"`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "replies.csv"; a.click()
    URL.revokeObjectURL(url)
    toast.success("تم التصدير")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">سجل الردود</h1>
          <p className="text-muted-foreground mt-1">جميع الردود التلقائية التي أرسلها البوت</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!replies.length}>
          <Download className="ml-2 h-4 w-4" /> تصدير CSV
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث في الردود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <p className="text-sm text-muted-foreground self-center">الإجمالي: {total}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : !filtered.length ? (
            <EmptyState search={search} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>صاحب التعليق</TableHead>
                  <TableHead>النص</TableHead>
                  <TableHead>الرد</TableHead>
                  <TableHead>التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                className="[&_tr:last-child]:border-0"
              >
                {filtered.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={rowVariants}
                    whileHover={{ scale: 1.015 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{r.commenter_name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{r.comment_text}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{r.reply_text}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {r.created_at ? format(new Date(r.created_at), "yyyy/MM/dd HH:mm", { locale: arSA }) : "-"}
                    </TableCell>
                  </motion.tr>
                ))}
              </motion.tbody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
          <span className="flex items-center text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>التالي</Button>
        </div>
      )}
    </div>
  )
}
