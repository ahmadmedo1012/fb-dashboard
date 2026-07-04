import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchUsers, createUser, updateUser, deleteUser } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, AlertCircle, Inbox, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

const ROLE_LABELS = { admin: "مدير", editor: "محرر", viewer: "مشاهد" }
const ROLE_COLORS = {
  admin: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300",
  editor: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  viewer: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
}

function UserDialog({ trigger, title, initial, onSubmit }) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(initial?.username || "")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState(initial?.role || "viewer")

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ ...initial, username, password, role }, () => setOpen(false))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">اسم المستخدم</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required disabled={!!initial} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {initial ? "كلمة مرور جديدة (اترك فارغاً بدون تغيير)" : "كلمة المرور"}
            </label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!initial} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">الصلاحية</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">مشاهد</SelectItem>
                <SelectItem value="editor">محرر</SelectItem>
                <SelectItem value="admin">مدير</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="submit">{initial ? "تحديث" : "إضافة"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Users() {
  const queryClient = useQueryClient()
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ["users"], queryFn: fetchUsers,
  })

  const createMut = useMutation({
    mutationFn: (d) => createUser(d.username, d.password, d.role),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("تمت إضافة المستخدم") },
    onError: (e) => toast.error(e.message),
  })

  const updateMut = useMutation({
    mutationFn: (d) => updateUser(d.id, d.role, d.password),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); toast.success("تم تحديث المستخدم") },
    onError: (e) => toast.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["users"] }); setDeleteConfirm(null); toast.success("تم حذف المستخدم") },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">المستخدمين</h1>
          <p className="text-sm text-slate-500 mt-1">إدارة المستخدمين والصلاحيات</p>
        </div>
        <UserDialog
          title="إضافة مستخدم جديد"
          trigger={
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة مستخدم
            </Button>
          }
          onSubmit={(d, close) => createMut.mutate(d, { onSuccess: close })}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
      ) : error ? (
        <div className="flex flex-col items-center py-16 text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <p className="text-slate-500 mb-4">{error.message}</p>
          <Button variant="outline" onClick={refetch}>إعادة المحاولة</Button>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">لا يوجد مستخدمين</p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">المستخدم</th>
                <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">الصلاحية</th>
                <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right">تاريخ الإضافة</th>
                <th className="text-xs font-medium text-slate-500 px-4 py-3 text-right w-24">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-900 dark:text-white">{u.username}</td>
                  <td className="px-4 py-4">
                    <Badge className={cn("text-xs rounded-full", ROLE_COLORS[u.role])}>
                      <Shield className="h-3 w-3 ml-1" />
                      {ROLE_LABELS[u.role]}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-500">{u.created_at?.slice(0, 10) || "-"}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <UserDialog
                        title="تعديل المستخدم"
                        initial={u}
                        trigger={
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                        onSubmit={(d, close) => updateMut.mutate(d, { onSuccess: close })}
                      />
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => setDeleteConfirm(u)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(o) => { if (!o) setDeleteConfirm(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>تأكيد حذف المستخدم</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            هل أنت متأكد من حذف المستخدم <strong>{deleteConfirm?.username}</strong>؟ لا يمكن التراجع.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteMut.mutate(deleteConfirm.id)}>
              {deleteMut.isPending ? "جاري..." : "حذف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
