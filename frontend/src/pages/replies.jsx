import { useState, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { Search, Download, AlertCircle, Inbox } from "lucide-react"
import { toast } from "sonner"

import { fetchReplies } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

const PER_PAGE = 20

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-slate-800 mb-1">خطأ في تحميل الردود</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">
        {error?.message || "حدث خطأ غير متوقع"}
      </p>
      <Button variant="outline" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  )
}

function EmptyState({ search }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        {search ? "لا توجد نتائج" : "لا توجد ردود"}
      </h3>
      <p className="text-sm text-slate-500">
        {search ? "حاول تعديل البحث" : "الردود ستظهر هنا بعد إرسال البوت للردود التلقائية"}
      </p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

function ExportCSV({ replies }) {
  const handleExport = useCallback(() => {
    if (!replies.length) return
    const header = "commenter,comment,reply,date\n"
    const rows = replies
      .map(
        (r) =>
          `"${r.commenter_name}","${(r.comment_text || "").replace(/"/g, '""')}","${(r.reply_text || "").replace(/"/g, '""')}","${r.created_at}"`
      )
      .join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `replies_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("تم تصدير الملف")
  }, [replies])

  return (
    <Button
      onClick={handleExport}
      disabled={!replies.length}
      variant="outline"
    >
      <Download className="ml-2 h-4 w-4" />
      تصدير CSV
    </Button>
  )
}

function Pagination({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
        className="border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        السابق
      </Button>
      <span className="text-sm text-slate-500 px-2">
        صفحة {page} من {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
        className="border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
      >
        التالي
      </Button>
    </div>
  )
}

export function Replies() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["replies", page, search],
    queryFn: () => fetchReplies(page, PER_PAGE, search),
    placeholderData: (prev) => prev,
  })

  const replies = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">سجل الردود</h1>
          <p className="text-sm text-slate-500 mt-1">جميع الردود التلقائية التي أرسلها البوت</p>
        </div>
        <ExportCSV replies={replies} />
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="pr-9 bg-white border-slate-200"
          />
        </div>
        <p className="text-sm text-slate-500 self-center">
          الإجمالي: {total}
        </p>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-right">صاحب التعليق</th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-right">النص</th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-right">الرد</th>
              <th className="text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3 text-right">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <LoadingSkeleton />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <ErrorState error={error} onRetry={refetch} />
                </td>
              </tr>
            ) : !replies.length ? (
              <tr>
                <td colSpan={4} className="p-0">
                  <EmptyState search={search} />
                </td>
              </tr>
            ) : (
              <motion.tbody
                className="contents"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                initial="hidden"
                animate="visible"
              >
                {replies.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={rowVariants}
                    whileHover={{ scale: 1.01 }}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4 align-middle font-medium text-slate-900">
                      {r.commenter_name}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-500 max-w-xs truncate">
                      {r.comment_text}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-500 max-w-xs truncate">
                      {r.reply_text}
                    </td>
                    <td className="px-4 py-4 align-middle text-sm text-slate-500 whitespace-nowrap">
                      {r.created_at
                        ? format(new Date(r.created_at), "yyyy/MM/dd HH:mm", { locale: arSA })
                        : "-"}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination page={page} totalPages={totalPages} setPage={setPage} />
    </div>
  )
}
