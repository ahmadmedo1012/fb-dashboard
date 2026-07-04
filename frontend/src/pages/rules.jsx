import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchRules, createRule, updateRule, deleteRule, toggleRule } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import {
  Plus,
  Pencil,
  Trash2,
  Power,
  AlertCircle,
  Inbox,
  Search,
} from "lucide-react"
import { cn } from "@/lib/utils"

function RuleForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name || "")
  const [keywords, setKeywords] = useState(initial?.keywords?.join(", ") || "")
  const [reply, setReply] = useState(initial?.reply_template || "")
  const [desc, setDesc] = useState(initial?.description || "")

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({ ...initial, name, keywords, reply_template: reply, description: desc })
      }}
      className="space-y-4"
    >
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">الاسم</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">الكلمات المفتاحية (مفصولة بفاصلة)</label>
        <Input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          required
          placeholder="سعر, كم السعر, بكم"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">نص الرد</label>
        <Textarea value={reply} onChange={(e) => setReply(e.target.value)} required rows={3} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">وصف</label>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit">{initial ? "تحديث" : "إضافة"}</Button>
      </div>
    </form>
  )
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">خطأ في تحميل القواعد</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">
        {error?.message || "حدث خطأ غير متوقع"}
      </p>
      <Button variant="outline" onClick={onRetry}>
        إعادة المحاولة
      </Button>
    </div>
  )
}

function EmptyState({ search, filterEnabled }) {
  const hasFilters = search || filterEnabled !== "all"
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Inbox className="h-12 w-12 text-slate-300 mb-4" />
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-1">
        {hasFilters ? "لا توجد نتائج" : "لا توجد قواعد"}
      </h3>
      <p className="text-sm text-slate-500">
        {hasFilters ? "حاول تعديل البحث أو الفلتر" : "أضف قاعدة جديدة للبدء"}
      </p>
    </div>
  )
}

function DeleteConfirm({ rule, onConfirm, onCancel, pending }) {
  return (
    <Dialog open={!!rule} onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent>
        <DialogHeader><DialogTitle>تأكيد حذف القاعدة</DialogTitle></DialogHeader>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          هل أنت متأكد من حذف <strong>{rule?.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onCancel}>إلغاء</Button>
          <Button variant="destructive" onClick={() => onConfirm(rule.id)} disabled={pending}>
            {pending ? "جاري..." : "حذف"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Rules({ role }) {
  const canEdit = role === "admin" || role === "editor"
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [filterEnabled, setFilterEnabled] = useState("all")
  const [page, setPage] = useState(1)
  const perPage = 10
  const [editRule, setEditRule] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: rules = [], isLoading, error, refetch } = useQuery({
    queryKey: ["rules"],
    queryFn: fetchRules,
  })

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["rules"] }); setDeleteTarget(null); toast.success("تم حذف القاعدة") },
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">القواعد</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة قواعد الرد التلقائي</p>
        </div>
        {canEdit && (
          <Dialog open={showAdd} onOpenChange={setShowAdd}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة قاعدة
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>إضافة قاعدة جديدة</DialogTitle>
              </DialogHeader>
              <RuleForm
                onSubmit={(d) => createMut.mutate(d)}
                onCancel={() => setShowAdd(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <div className="relative max-w-xs w-full">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pr-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
          />
        </div>
        <Select value={filterEnabled} onValueChange={(v) => { setFilterEnabled(v); setPage(1) }}>
          <SelectTrigger className="w-40 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="enabled">مفعل</SelectItem>
            <SelectItem value="disabled">معطل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">القاعدة</th>
              <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">الكلمات المفتاحية</th>
              <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right w-1/3">الرد</th>
              <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">الحالة</th>
              <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {isLoading ? (
              <tr><td colSpan={5} className="p-6"><div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div></td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="p-0"><ErrorState error={error} onRetry={refetch} /></td></tr>
            ) : paged.length === 0 ? (
              <tr><td colSpan={5} className="p-0"><EmptyState search={search} filterEnabled={filterEnabled} /></td></tr>
            ) : (
              paged.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-4 align-middle font-medium text-slate-900 dark:text-white">{r.name}</td>
                  <td className="px-4 py-4 align-middle text-sm text-slate-500 max-w-xs truncate">
                    {r.keywords?.slice(0, 4).join(", ")}{r.keywords?.length > 4 ? "..." : ""}
                  </td>
                  <td className="px-4 py-4 align-middle text-sm text-slate-500 max-w-xs truncate">{r.reply_template?.substring(0, 80)}</td>
                  <td className="px-4 py-4 align-middle">
                    <Badge className={cn(r.enabled ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300" : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400")}>
                      {r.enabled ? "فعال" : "معطل"}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <div className="flex gap-1">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => toggleMut.mutate(r.id)}
                            className={cn("hover:bg-slate-100 dark:hover:bg-slate-700", r.enabled ? "text-green-500 hover:text-green-600" : "text-slate-400 hover:text-slate-500")}>
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditRule(r)}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(r)}
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editRule !== null} onOpenChange={(o) => { if (!o) setEditRule(null) }}>
        <DialogContent className="rounded-xl">
          <DialogHeader><DialogTitle>تعديل القاعدة</DialogTitle></DialogHeader>
          {editRule && <RuleForm initial={editRule} onSubmit={(d) => updateMut.mutate(d)} onCancel={() => setEditRule(null)} />}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirm rule={deleteTarget} onConfirm={(id) => deleteMut.mutate(id)} onCancel={() => setDeleteTarget(null)} pending={deleteMut.isPending} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}
            className="border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            السابق
          </Button>
          <span className="text-sm text-slate-500 px-2">صفحة {page} من {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}
            className="border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 disabled:opacity-40">
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
