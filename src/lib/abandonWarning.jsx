import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const AbandonWarningContext = createContext(null);

function AbandonWarningOverlay({ message, onDismiss }) {
  return (
    <div className="fixed inset-0 z-[9998] bg-red-950/97 flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500/50 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Aviso por abandono</h1>
        <p className="text-red-200 leading-relaxed mb-8 text-sm whitespace-pre-wrap">{message}</p>
        <button
          onClick={onDismiss}
          className="px-10 py-3 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg transition-colors text-base"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

export function AbandonWarningProvider({ children }) {
  const [pending, setPending] = useState(null);

  const showWarning = useCallback((message) => {
    return new Promise(resolve => {
      setPending({ message, resolve });
    });
  }, []);

  const handleDismiss = () => {
    if (pending?.resolve) pending.resolve();
    setPending(null);
  };

  return (
    <AbandonWarningContext.Provider value={{ showWarning }}>
      {children}
      {pending && <AbandonWarningOverlay message={pending.message} onDismiss={handleDismiss} />}
    </AbandonWarningContext.Provider>
  );
}

export const useAbandonWarning = () => useContext(AbandonWarningContext);
