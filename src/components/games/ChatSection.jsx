import React, { useState, useEffect, useRef } from "react";
import { getChatMessages, sendChatMessage } from "@/api/chat";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Flag } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import ReportDialog from "@/components/moderation/ReportDialog";

export default function ChatSection({ gameId, user, sessionId }) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const containerRef = useRef(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);

  const canChat = !!user && !!gameId && !!sessionId;

  const { data: messages = [], refetch } = useQuery({
    queryKey: ["chat-messages", gameId, sessionId],
    queryFn: () => getChatMessages(gameId, sessionId),
    enabled: !!gameId && !!sessionId,
  });

  useEffect(() => {
    if (!canChat) return;
    const interval = setInterval(() => refetch(), 4000);
    return () => clearInterval(interval);
  }, [refetch, canChat]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || isSending || !user) return;
    if (!sessionId) {
      toast.message("Crea o únete a una partida para habilitar el chat.");
      return;
    }
    if (user?.is_banned) {
      toast.error("Tu cuenta está baneada");
      return;
    }
    setIsSending(true);
    try {
      await sendChatMessage(gameId, sessionId, message.trim());
      setMessage("");
      refetch();
    } catch {
      toast.error("No se pudo enviar el mensaje");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) {
    return <div className="text-center py-8 text-gray-400"><p>Inicia sesión para chatear</p></div>;
  }
  if (!sessionId) {
    return <div className="text-center py-8 text-gray-400"><p>Crea o únete a una partida para abrir el chat.</p></div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500"><p>Sé el primero en enviar un mensaje</p></div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.user_email === user.email;
            return (
              <div key={msg.id} className={`p-3 rounded-lg ${
                isOwnMessage
                  ? "bg-purple-500/10 border border-purple-500/20"
                  : "bg-white/5 border border-white/10"
              }`}>
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-white text-sm">{msg.user_name || msg.user_email}</span>
                    <span className="text-xs text-gray-500">
                      {msg.created_at ? format(new Date(msg.created_at), "HH:mm") : ""}
                    </span>
                  </div>
                  {!isOwnMessage && (
                    <button type="button" className="text-gray-400 hover:text-red-400 transition" title="Reportar mensaje"
                      onClick={() => {
                        setReportTarget({
                          target_kind: "chat_message",
                          target_id: msg.id,
                          game_id: gameId,
                          session_id: sessionId,
                          reported_user_email: msg.user_email,
                          reported_user_name: msg.user_name,
                          target_text: msg.message,
                        });
                        setReportOpen(true);
                      }}
                    >
                      <Flag className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-300 text-sm break-words">{msg.message}</p>
              </div>
            );
          })
        )}
      </div>

      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          maxLength={300}
          className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          disabled={isSending || !canChat}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending || !canChat}
          className="bg-gradient-to-r from-purple-600 to-cyan-500 hover:opacity-90"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} reporter={user} target={reportTarget} />
    </div>
  );
}
