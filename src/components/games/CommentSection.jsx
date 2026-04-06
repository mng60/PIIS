import React, { useState } from "react";
import { addComment, deleteComment } from "@/api/comments";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, MessageSquare, Flag, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { getLevelFromXP } from "@/lib/levels";
import ReportDialog from "@/components/moderation/ReportDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CommentSection({ gameId, comments, user, onCommentAdded }) {
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const isAdmin = user?.role === "admin";
  const isRegularUser = user && user.role !== "admin" && user.role !== "empresa";
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || !user) return;
    setIsSubmitting(true);
    try {
      await addComment(gameId, content.trim(), rating || null);
      setContent("");
      setRating(0);
      toast.success("Comentario publicado");
      onCommentAdded?.();
    } catch {
      toast.error("No se pudo publicar el comentario");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm text-gray-400 mb-2 ${isLevel1User ? "user-level-1-comment-label" : ""}`}>Tu valoracion</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star className={`w-6 h-6 transition-colors ${
                    star <= (hoveredRating || rating) ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                  }`} />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Escribe tu comentario..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-24 ${isLevel1User ? "user-level-1-comment-textarea" : ""}`}
            maxLength={800}
          />
          <Button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className={isLevel1User ? "user-level-1-comment-button" : "bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"}
          >
            <Send className="w-4 h-4 mr-2" />
            Publicar
          </Button>
        </form>
      ) : (
        <div className="p-4 bg-white/5 rounded-lg text-center">
          <p className="text-gray-400">Inicia sesion para dejar un comentario</p>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className={`text-center py-8 text-gray-500 ${isLevel1User ? "user-level-1-comment-empty" : ""}`}>
            <MessageSquare className={`w-12 h-12 mx-auto mb-3 opacity-30 ${isLevel1User ? "user-level-1-comment-empty-icon" : ""}`} />
            <p className={isLevel1User ? "user-level-1-comment-empty" : ""}>Sin comentarios aun</p>
            <p className={`text-sm ${isLevel1User ? "user-level-1-comment-empty" : ""}`}>Se el primero en opinar</p>
          </div>
        ) : (
          comments.map((comment) => {
            const canReport = user && comment.user_email !== user.email;
            return (
              <div key={comment.id} className="p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{comment.user_name}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(comment.created_at), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comment.rating && (
                      <div className="flex gap-0.5 mr-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} className={`w-4 h-4 ${
                            star <= comment.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                          }`} />
                        ))}
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        title="Borrar comentario"
                        className="text-gray-400 hover:text-red-400 transition"
                        onClick={() => setDeleteTarget(comment)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {canReport && (
                      <button
                        type="button"
                        title="Reportar comentario"
                        className="text-gray-400 hover:text-red-400 transition"
                        onClick={() => {
                          setReportTarget({
                            target_kind: "comment",
                            target_id: comment.id,
                            game_id: gameId,
                            reported_user_email: comment.user_email,
                            reported_user_name: comment.user_name,
                            target_text: comment.content,
                          });
                          setReportOpen(true);
                        }}
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-gray-300 break-words">{comment.content}</p>
              </div>
            );
          })
        )}
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} reporter={user} target={reportTarget} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-zinc-950 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Borrar comentario?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta accion no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                try {
                  await deleteComment(deleteTarget.id);
                  toast.success("Comentario borrado");
                  setDeleteTarget(null);
                  onCommentAdded?.();
                } catch {
                  toast.error("No se pudo borrar");
                }
              }}
            >
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
