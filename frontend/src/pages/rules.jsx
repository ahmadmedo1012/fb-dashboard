import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { motion } from "framer-motion"
import { fetchRules, createRule, updateRule, deleteRule, toggleRule } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, Power, AlertCircle, Inbox } from "lucide-react"

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-1">خطأ في تحميل القواعد</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{error?.message || "حدث خطأ غير متوقع"}</p>
      <Button variant="outline" onClick={onRetry}>إعادة المحاولة</Button>
    </div>
  )
}

function EmptyState({ search, filterEnabled }) {
  const hasFilters = search || filterEnabled !== "all"
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-1">{hasFilters ? "لا توجد نتائج" : "لا توجد قواعد"}</h3>
      <p className="text-sm text-muted-foreground">
        {hasFilters ? "حاول تعديل البحث أو الفلتر" : "أضف قاعدة جديدة للبدء"}
      </p>
    </div>
  )
}

export function Rules() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filterEnabled, setFilterEnabled] = useState("all")
  const [page, setPage] = useState(1)
  const perPage = 10
  const [editRule, setEditRule] = useState(null) // eslint-disable-line
  const [showAdd, setShowAdd] = useState(false)

  const { data: rules = [], isLoading, error, refetch } = useQuery({ queryKey: ["rules"], queryFn: fetchRules })

  const filtered = rules.filter((r) => {
    if (filterEnabled === "enabled" && !r.enabled) return false
    if (filterEnabled === "disabled" && r.enabled) return false
    if (search && !r.name.includes(search) && !r.description?.includes(search)) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / perPage)
  const paged = filtered.slice((page - 1) * perPage, page * perPage)

  const toggleMut = useMutation({
    mutationFn: (id) => toggleRule(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules"] }); toast.success("تم تحديث الحالة") },
    onError: (e) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deleteRule(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules"] }); toast.success("تم حذف القاعدة") },
    onError: (e) => toast.error(e.message),
  })

  const createMut = useMutation({
    mutationFn: (d) => createRule(d.name, d.keywords, d.reply_template, d.description),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules"] }); setShowAdd(false); toast.success("تمت إضافة القاعدة") },
    onError: (e) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (d) => updateRule(d.id, d.name, d.keywords, d.reply_template, d.description),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules"] }); setEditRule(null); toast.success("تم تحديث القاعدة") },
    onError: (e) => toast.error(e.message),
  })

  function RuleForm({ initial, onSubmit, onCancel }) {
    const [name, setName] = useState(initial?.name || "")
    const [keywords, setKeywords] = useState(initial?.keywords?.join(", ") || "")
    const [reply, setReply] = useState(initial?.reply_template || "")
    const [desc, setDesc] = useState(initial?.description || "")

    return (
      <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...initial, name, keywords, reply_template: reply, description: desc }) }} className="space-y-4">
        <div>
          <label className="text-sm font-medium">الاسم</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">الكلمات المفتاحية (مفصولة بفاصلة)</label>
          <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} required placeholder="سعر, كم السعر, بكم" />
        </div>
        <div>
          <label className="text-sm font-medium">نص الرد</label>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} required rows={3} />
        </div>
        <div>
          <label className="text-sm font-medium">وصف</label>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" type="button" onClick={onCancel}>إلغاء</Button>
          <Button type="submit">{initial ? "تحديث" : "إضافة"}</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">القواعد</h1>
          <p className="text-muted-foreground mt-1">إدارة قواعد الرد التلقائي</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />إضافة قاعدة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>إضافة قاعدة جديدة</DialogTitle></DialogHeader>
            <RuleForm onSubmit={(d) => createMut.mutate(d)} onCancel={() => setShowAdd(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterEnabled} onValueChange={setFilterEnabled}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="enabled">مفعل</SelectItem>
            <SelectItem value="disabled">معطل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : paged.length === 0 ? (
            <EmptyState search={search} filterEnabled={filterEnabled} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>القاعدة</TableHead>
                  <TableHead>الكلمات المفتاحية</TableHead>
                  <TableHead className="w-1/3">الرد</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <motion.tbody
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
                className="[&_tr:last-child]:border-0"
              >
                {paged.map((r) => (
                  <motion.tr
                    key={r.id}
                    variants={rowVariants}
                    whileHover={{ scale: 1.015 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {r.keywords?.slice(0, 4).join(", ")}{r.keywords?.length > 4 ? "..." : ""}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {r.reply_template?.substring(0, 80)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.enabled ? "default" : "secondary"}>
                        {r.enabled ? "فعال" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => toggleMut.mutate(r.id)}>
                          <Power className="h-4 w-4" />
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => setEditRule(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>تعديل القاعدة</DialogTitle></DialogHeader>
                            <RuleForm initial={r} onSubmit={(d) => updateMut.mutate(d)} onCancel={() => setEditRule(null)} />
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("تأكيد حذف القاعدة؟")) deleteMut.mutate(r.id) }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
