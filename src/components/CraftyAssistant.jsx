import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react'; // Bot se usa como fallback en CraftyAvatar
import { useAuth } from '@/lib/AuthContext';
import { chatWithCrafty } from '@/api/assistant';
import { useFloatingPanels } from '@/lib/FloatingPanelsContext';
import { getLevelFromXP } from '@/lib/levels';

// Imagen de Crafty — pon cualquier imagen en public/crafty.png para cambiarla
const CRAFTY_IMG = '/crafty.png';
const LEVEL_1_CRAFTY_IMG = '/chat-image/minero.png';
const LEVEL_2_CRAFTY_IMG = '/chat-image/jardinero.png';

function CraftyAvatar({ size = 'md', imageSrc = CRAFTY_IMG }) {
  const [error, setError] = useState(false);
  const cls = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const iconCls = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const isLevel1Image = imageSrc === LEVEL_1_CRAFTY_IMG;
  const isLevel2Image = imageSrc === LEVEL_2_CRAFTY_IMG;

  useEffect(() => {
    setError(false);
  }, [imageSrc]);

  const wrapperClass = isLevel1Image
    ? `${cls} user-level-1-crafty-avatar flex-shrink-0 flex items-center justify-center`
    : isLevel2Image
      ? `${cls} user-level-2-crafty-avatar flex-shrink-0 flex items-center justify-center`
    : `${cls} rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex-shrink-0 flex items-center justify-center overflow-hidden`;

  return (
    <div className={wrapperClass}>
      {error
        ? <Bot className={`${iconCls} text-white ${isLevel1Image ? "user-level-1-crafty-avatar-fallback-icon" : ""} ${isLevel2Image ? "user-level-2-crafty-avatar-fallback-icon" : ""}`} />
        : <img src={imageSrc} alt="Crafty" className={`w-full h-full object-cover ${isLevel1Image ? "user-level-1-crafty-avatar-img" : ""} ${isLevel2Image ? "user-level-2-crafty-avatar-img" : ""}`} onError={() => setError(true)} />
      }
    </div>
  );
}

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
  const { isAssistantOpen: open, isChessAlertOpen, toggleAssistant, closeAssistant } = useFloatingPanels();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const role = user?.role || 'user';
  const isRegularUser = user && user.role !== 'admin' && user.role !== 'empresa';
  const isLevel1User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 1;
  const isLevel2User = isRegularUser && getLevelFromXP(user.xp ?? 0).level === 2;
  const craftyImage = isLevel1User ? LEVEL_1_CRAFTY_IMG : isLevel2User ? LEVEL_2_CRAFTY_IMG : CRAFTY_IMG;

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

  // Focus al input al abrir y al terminar de cargar
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (!loading && open) inputRef.current?.focus();
  }, [loading]);

  // Cerrar al pinchar fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        closeAssistant();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeAssistant, open]);

  if (!isAuthenticated) return null;
  if (isChessAlertOpen) return null;

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

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
    <div ref={containerRef} className={`fixed bottom-6 left-6 z-50 flex flex-col items-start ${isLevel1User ? "user-level-1-crafty" : ""} ${isLevel2User ? "user-level-2-crafty" : ""}`}>
      {/* Panel de chat */}
      {open && (
        <div className={`mb-3 w-80 rounded-2xl border border-white/10 bg-[#0f0f18] shadow-2xl shadow-purple-900/30 flex flex-col overflow-hidden ${isLevel1User ? "user-level-1-crafty-panel" : ""} ${isLevel2User ? "user-level-2-crafty-panel" : ""}`}
          style={{ height: '420px' }}>

          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-700 to-cyan-600 ${isLevel1User ? "user-level-1-crafty-header" : ""} ${isLevel2User ? "user-level-2-crafty-header" : ""}`}>
            <div className="flex items-center gap-2">
              <CraftyAvatar size="md" imageSrc={craftyImage} />
              <div>
                <p className="text-white font-semibold text-sm leading-none">Crafty</p>
                <p className="text-white/70 text-xs">Asistente PlayCraft</p>
              </div>
            </div>
            <button onClick={closeAssistant}
              className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="mr-2 mt-0.5">
                    <CraftyAvatar size="sm" imageSrc={craftyImage} />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? `${isLevel1User ? 'user-level-1-crafty-user-message' : ''} ${isLevel2User ? 'user-level-2-crafty-user-message' : ''} bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-br-sm`
                      : `${isLevel1User ? 'user-level-1-crafty-assistant-message' : ''} ${isLevel2User ? 'user-level-2-crafty-assistant-message' : ''} bg-white/5 text-gray-200 rounded-bl-sm`
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatText(msg.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="mr-2 mt-0.5">
                  <CraftyAvatar size="sm" imageSrc={craftyImage} />
                </div>
                <div className={`${isLevel1User ? "user-level-1-crafty-assistant-message" : ""} ${isLevel2User ? "user-level-2-crafty-assistant-message" : ""} bg-white/5 rounded-2xl rounded-bl-sm px-3 py-2`}>
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={`${isLevel1User ? "user-level-1-crafty-input-wrap" : ""} ${isLevel2User ? "user-level-2-crafty-input-wrap" : ""} px-3 pb-3 pt-2 border-t border-white/5`}>
            <div className={`${isLevel1User ? "user-level-1-crafty-input" : ""} ${isLevel2User ? "user-level-2-crafty-input" : ""} flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2`}>
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Escribe tu pregunta..."
                maxLength={500}
                disabled={loading}
                className={`${isLevel1User ? "user-level-1-crafty-input-field" : ""} ${isLevel2User ? "user-level-2-crafty-input-field" : ""} flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none disabled:opacity-50`}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className={`${isLevel1User ? "user-level-1-crafty-send" : ""} ${isLevel2User ? "user-level-2-crafty-send" : ""} text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-colors`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={toggleAssistant}
        className={`${isLevel1User ? "user-level-1-crafty-button" : ""} ${isLevel2User ? "user-level-2-crafty-button" : ""} w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-900/50 hover:scale-105 transition-transform overflow-hidden`}
        title="Crafty - Asistente"
      >
        {open
          ? <X className="w-5 h-5 text-white" />
          : <CraftyAvatar size="md" imageSrc={craftyImage} />
        }
      </button>
    </div>
  );
}
