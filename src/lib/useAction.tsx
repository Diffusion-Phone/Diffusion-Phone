'use client';

import { useGameState } from "@/contexts/GameStateProvider";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useCallback } from "react";

//TODO: add a parameter: isHost to make sure he could access the host actions
export const useAction = (host= false) => {
  const { socket } = useSocketAuth();
  const { isHost, gameState } = useGameState();

  const joinGame = useCallback(() => {
    if (socket) {
      socket.emit("addPlayer");
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket) {
      console.log(isHost,gameState) 
      socket.emit("startGame");
    }
  }, [socket]);

  const endGame = useCallback(() => {
    if (socket) {
      socket.emit("endGame");
    }
  }, [socket]);

  const submitPrompt = useCallback(
    (playerId: string, prompt: string) => {
      if (socket) {
        socket.emit("submitPrompt", playerId, prompt);
      }
    },
    [socket],
  );

  const submitDrawing = useCallback(
    (playerId: string, drawing: string) => {
      if (socket) {
        socket.emit("submitDraw", playerId, drawing);
      }
    },
    [socket],
  );

  const likeDraw = useCallback(
    (playerId: string, socketId: string) => {
      if (socket) {
        socket.emit("likeDrawing", playerId, socketId);
      }
    },
    [socket],
  );

  const backRoom = useCallback(() => {
    if (socket) {
      socket.emit("backRoom");
    }
  }, [socket]);

  return {
    joinGame,
    startGame,
    endGame,
    submitPrompt,
    submitDrawing,
    likeDraw,
    backRoom,
  };
};
