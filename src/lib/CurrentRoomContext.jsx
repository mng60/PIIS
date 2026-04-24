import { createContext, useContext, useState } from 'react';

const CurrentRoomContext = createContext(null);

export function CurrentRoomProvider({ children }) {
  const [currentRoom, setCurrentRoomState] = useState(null);

  const setCurrentRoom = ({ roomCode, gameId, gameTitle }) => {
    setCurrentRoomState({ roomCode, gameId, gameTitle: gameTitle || '' });
  };

  const clearCurrentRoom = () => setCurrentRoomState(null);

  return (
    <CurrentRoomContext.Provider value={{ currentRoom, setCurrentRoom, clearCurrentRoom }}>
      {children}
    </CurrentRoomContext.Provider>
  );
}

export function useCurrentRoom() {
  return useContext(CurrentRoomContext);
}
