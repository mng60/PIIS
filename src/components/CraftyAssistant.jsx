import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { chatWithCrafty } from '@/api/assistant';

const WELCOME_BY_ROLE = {
  user:    '¡Hola! Soy **Crafty**, tu asistente en PlayCraft. Puedo ayudarte con preguntas sobre juegos, salas, ELO, logros, torneos y más. ¿En qué te ayudo?',
  empresa: '¡Hola! Soy **Crafty**. Puedo ayudarte a subir juegos, crear torneos, configurar logros y gestionar tu panel empresa. ¿Qué necesitas?',
  admin:   '¡Hola! Soy **Crafty**. Puedo ayudarte con reportes, sanciones, gestión de usuarios, mantenimiento y más. ¿En qué te ayudo?',
};

function formatText(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^• /gm, '&bull; ')
    .replace(/\n/g, '<br/>');
}

export default function CraftyAssistant() {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const role = user?.role || 'user';

  // Mensaje de bienvenida al abrir por primera vez
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: WELCOME_BY_ROLE[role] || WELCOME_BY_ROLE.user,
      }]);
    }
  }, [open]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus al input al abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // Cerrar al pinchar fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!isAuthenticated) return null;

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    inputRef.current?.focus();

    try {
      const history = nextMessages.slice(-7, -1); // últimos 6 antes del actual
      const { reply } = await chatWithCrafty(text, history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu pregunta. Inténtalo de nuevo.',
      }]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div ref={containerRef} className="fixed bottom-6 left-6 z-50 flex flex-col items-start">
      {/* Panel de chat */}
      {open && (
        <div className="mb-3 w-80 rounded-2xl border border-white/10 bg-[#0f0f18] shadow-2xl shadow-purple-900/30 flex flex-col overflow-hidden"
          style={{ height: '420px' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-700 to-cyan-600">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-none">Crafty</p>
                <p className="text-white/70 text-xs">Asistente PlayCraft</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">
                    <Bot className="w-3 h-3 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-br-sm'
                      : 'bg-white/5 text-gray-200 rounded-bl-sm'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatText(msg.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex-shrink-0 flex items-center justify-center mr-2 mt-0.5">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <div className="bg-white/5 rounded-2xl rounded-bl-sm px-3 py-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu pregunta..."
                maxLength={500}
                disabled={loading}
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-900/50 hover:scale-105 transition-transform"
        title="Crafty - Asistente"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <Bot className="w-5 h-5 text-white" />
        }
      </button>
    </div>
  );
}
