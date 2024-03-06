"use client";

import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useCallback } from "react";

//TODO: add a parameter: isHost to make sure he could access the host actions
export const useAction = () => {
  const { socket } = useSocketAuth();

  const joinGame = useCallback(() => {
    if (socket) {
      socket.emit("addPlayer");
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket) {
      socket.emit("startGame");
    }
  }, [socket]);

  const endGame = useCallback(() => {
    if (socket) {
      socket.emit("endGame");
    }
  }, [socket]);

  const submitPrompt = useCallback(
    (prompt: string) => {
      if (socket) {
        socket.emit("submitPrompt", prompt);
      }
    },
    [socket],
  );

  const submitDrawing = useCallback(
    (drawing: string) => {
      if (socket) {
        socket.emit("submitDraw", drawing);
      }
    },
    [socket],
  );

  const likeDraw = useCallback(
    (playerId: string) => {
      if (socket) {
        socket.emit("likeDrawing", playerId);
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
