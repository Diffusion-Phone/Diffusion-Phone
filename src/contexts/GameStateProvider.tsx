"use client";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
  ReactNode,
  useCallback,
} from "react";

import { useSocketAuth } from "./SocketAuthContext";

interface GameState {
  players: Array<string>;
  isHost: boolean;
  uploadedImgs: Array<string>;
  gameState:
    | "init"
    | "waitingForPlayer"
    | "waitingForPrompt"
    | "waitingForDraw"
    | "ended";
  leaderBoard: Array<[string, string]>;
}

const GameStateContext = createContext<GameState | undefined>(undefined);

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>();

  const { socket } = useSocketAuth();

  useEffect(() => {
    if (socket) {
      socket.on("gameState", (gameState: GameState) => {
        setGameState(gameState);
      });
    }
  }, [socket]);

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
};
