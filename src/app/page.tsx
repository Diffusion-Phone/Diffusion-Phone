'use client'
import { HomePage } from "@/components/homePage";
import DrawRoom from "@/components/drawPage";
import EndRoom from "@/components/endPage";
import NavBar from "@/components/navBar";
import PromptRoom from "@/components/promptPage";
import WaitRoom from "@/components/waitingPage";
import { useGameState } from "@/contexts/GameStateProvider";
import { useCallback} from "react";

export default function Home() {

  const {gameState, isHost} = useGameState()

  const StageComponent = useCallback(() => {
    console.log(" game state", gameState)
    if (gameState === "none") {
      return <HomePage/>
    }
    if (isHost) {
      if (gameState === "waitingForParticipants") {
        return <WaitRoom />
      }
      if (gameState === "waitingForStory" || gameState === "waitingForDrawings") {
        return <PromptRoom/>
      } else {
        return <EndRoom />
      }
    } else {
      if (gameState === "waitingForParticipants" || gameState === "waitingForStory") {
        return <WaitRoom />
      }     
      if (gameState === "waitingForDrawings") {
        return <DrawRoom/>
      }
      else {
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
