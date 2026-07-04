import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchPosts, publishPost } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Plus, Send, Clock, FileText, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"

export function Posts() {
  const queryClient = useQueryClient()
  const [showPublish, setShowPublish] = useState(false)
  const [message, setMessage] = useState("")

  const { data: posts = [], isLoading } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts, refetchInterval: 30000 })

  const publishMut = useMutation({
    mutationFn: () => publishPost(message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] })
      setShowPublish(false)
      setMessage("")
      toast.success("تم نشر المنشور بنجاح")
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">المنشورات</h1>
          <p className="text-muted-foreground mt-1">إدارة منشورات الصفحة</p>
        </div>
        <Dialog open={showPublish} onOpenChange={setShowPublish}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" />نشر منشور</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>نشر منشور جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); publishMut.mutate() }} className="space-y-4">
              <Textarea
                placeholder="اكتب محتوى المنشور..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" type="button" onClick={() => setShowPublish(false)}>إلغاء</Button>
                <Button type="submit" disabled={publishMut.isPending}>
                  <Send className="ml-2 h-4 w-4" />
                  {publishMut.isPending ? "جاري النشر..." : "نشر"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            لا توجد منشورات بعد
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm whitespace-pre-wrap break-words">{post.message || "(بدون نص)"}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{post.created_time ? format(new Date(post.created_time), "yyyy/MM/dd HH:mm", { locale: arSA }) : "-"}</span>
                    </div>
                  </div>
                  <a
                    href={`https://facebook.com/${post.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    <Button variant="ghost" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
