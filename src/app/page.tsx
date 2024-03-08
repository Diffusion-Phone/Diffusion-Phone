'use client'

import { AvatarPicker } from "@/components/customAvatar";
import DrawRoom from "@/components/drawPage";
import EndRoom from "@/components/endPage";
import NavBar from "@/components/navBar";
import PromptRoom from "@/components/promptPage";
import { Button } from "@/components/ui/button";
import WaitRoom from "@/components/waitingPage";
import { useGameState } from "@/contexts/GameStateProvider";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import Image from "next/image";
import { useCallback, useEffect } from "react";
import io from "socket.io-client";

export default function Home() {

  const {socket} = useSocketAuth()
  const {gameState, isHost} = useGameState()

  // useEffect(() => {
  //   if (socket) {
  //     socket.on("")
  //   }
  // }, [socket]);


  const StageComponent = useCallback(() => {
    console.log(" game state", gameState)
    if (gameState === "none") {
      return <AvatarPicker />
    }
    if (isHost) {
      if (gameState === "waitingForPlayers") {
        return <WaitRoom />
      }
      if (gameState === "waitingForPrompt" || gameState === "waitingForDraw") {
        return <PromptRoom/>
      }
      if (gameState === "ended") {
        return <EndRoom />
      }
    } else {
      if (gameState === "waitingForPlayers" || gameState === "waitingForPrompt") {
        return <WaitRoom />
      }     
      if (gameState === "waitingForDraw") {
        return <DrawRoom/>
      }
      if (gameState === "ended") {
        return <EndRoom />
      }
    }
  }, [gameState, isHost])

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <NavBar />
      <StageComponent />
        {/* <h1 className="text-5xl font-bold text-center">Welcome to the Solana Wallet</h1> */}
    </main>
  );
}
