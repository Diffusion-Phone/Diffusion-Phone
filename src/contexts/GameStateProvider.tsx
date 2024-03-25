'use client'
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
  ReactNode,
} from "react";
import { useSocketAuth } from "./SocketAuthContext";
import { type User } from "@/components/waitRoom";
import { toast } from "sonner";

interface GameState {
  players: Array<User>;
  gamePda: string;
  isHost: boolean;
  prompt: string;
  uploadedImgs: Array<[string, string]>;
  gameState:
    | "none"
    // | "init"
    | "waitingForPlayers"
    | "waitingForPrompt"
    | "waitingForDraw"
    | "ended";
  leaderBoard: Array<[string, string]>;
}

const defaultGameState: GameState = {
  players: [],
  gamePda: "",
  isHost: false,
  prompt: "",
  uploadedImgs: [],
  gameState: "none",
  leaderBoard: [],
};

const GameStateContext = createContext<GameState>(defaultGameState);

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  // TODO: listen to the game state change from the game account, remove all socket thing
  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  const { socket } = useSocketAuth();

  useEffect(() => {
    if (socket) {
      socket.on("gameState", (newGameState: GameState) => {
        setGameState(newGameState);
      });

      socket.on('disconnect', () => {
        setGameState(defaultGameState)
      })

      socket.on("goBackLobby", () => {
        setGameState((prev) => ({
          ...prev,
          uploadedImgs: [],
          gameState: "waitingForPlayers",
        }));
      })

      socket.on("updatePlayers", (players: Array<User>) => {
        setGameState((prev) => ({
          ...prev,
          players,
          isHost: prev.isHost || players.length === 1,
          gameState: "waitingForPlayers",
        }));
      });

      socket.on("updateLeaderBoard", (leaderBoard: Array<[string, string]>) => {
        setGameState((prev) => ({
          ...prev,
          leaderBoard,
        }));
      });

      socket.on("promptStart", (_) => {
        console.log("promptStart")
        setGameState((prev) => ({
          ...prev,
          gameState: "waitingForPrompt",
        }));
      });
      socket.on("promptFinished", (prompt: string) => {
        setGameState((prev) => ({
          ...prev,
          prompt,
          gameState: "waitingForDraw",
        }));
      });

      socket.on("draw", (draw: [string, string]) => {
        setGameState((prev) => ({
          ...prev,
          uploadedImgs: [...prev.uploadedImgs, draw],
        }));
      });

      socket.on("endGame", () => {
        setGameState((prev) => ({ ...prev, gameState: "ended" }));
      });

      socket.on("bestImage", (playerId: string, exploreUrl) => {
        toast.success(
          " The best image come from: " +
            playerId +
            " and the url is: " +
            exploreUrl,
        );
      });

      return () => {
        socket.off("gameState");
        socket.off("updatePlayers");
        socket.off("prompt");
        socket.off("draw");
        socket.off("endGame");
      };
    }
  }, [socket]);

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
};
