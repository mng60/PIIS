import { createContext, useContext, useMemo, useState } from 'react';

const FloatingPanelsContext = createContext(null);

export function FloatingPanelsProvider({ children }) {
  const [activePanel, setActivePanel] = useState(null);

  const value = useMemo(() => ({
    activePanel,
    isAssistantOpen: activePanel === 'assistant',
    isChessAlertOpen: activePanel === 'chess-alert',
    openAssistant: () => setActivePanel('assistant'),
    closeAssistant: () => setActivePanel(prev => (prev === 'assistant' ? null : prev)),
    toggleAssistant: () => setActivePanel(prev => (prev === 'assistant' ? null : 'assistant')),
    openChessAlert: () => setActivePanel('chess-alert'),
    closeChessAlert: () => setActivePanel(prev => (prev === 'chess-alert' ? null : prev)),
    toggleChessAlert: () => setActivePanel(prev => (prev === 'chess-alert' ? null : 'chess-alert')),
  }), [activePanel]);

  return (
    <FloatingPanelsContext.Provider value={value}>
      {children}
    </FloatingPanelsContext.Provider>
  );
}

export function useFloatingPanels() {
  const context = useContext(FloatingPanelsContext);
  if (!context) {
    throw new Error('useFloatingPanels must be used within FloatingPanelsProvider');
  }
  return context;
}
