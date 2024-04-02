'use client';
import { Button } from "@/components/ui/button";
import { Room } from "@/components/waitRoom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { useGameState } from "@/contexts/GameStateProvider";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useMutation } from "@tanstack/react-query";
import { startGame as startGameFn } from "@/lib/useAction";

function WaitDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open}>
      <DialogContent className="bg-secondary">
        <DialogHeader>
          <DialogTitle className="font-sans text-white">
            Wait for the Host to finish the story
          </DialogTitle>
          <DialogDescription className="font-sans text-white">
            {"Hold on! The story is coming!"}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function WaitRoom() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { players, isHost, gameState } = useGameState();
  const { program, provider, gamePda } = useWorkspace();

  useEffect(() => {
    if (!isHost && gameState === "waitingForStory") {
      setDialogOpen(true);
    }
    return () => {
      setDialogOpen(false);
    };
  }, [gameState, isHost]);

  const buttonEnabled = useMemo(
    () => isHost && players.length >= 2,
    [isHost, players]
  );

  const startGame = useMutation({
    mutationFn: async () => await startGameFn({ program, provider, gamePda }),
  });

  return (
    <>
      <div className="z-10 flex h-[450px] w-full max-w-[830px] flex-col items-center justify-center">
        <Room users={players} />
        <Button
          className="ring-offset-3 mt-10 flex h-[100px] w-[500px] items-center justify-center rounded-xl text-[64px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]"
          disabled={!buttonEnabled || startGame.isPending}
          onClick={() => startGame.mutate()}
        >
          <div className="mr-1 overflow-hidden rounded-full ">
            {startGame.isPending ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24"><g><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".14"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".29" transform="rotate(30 12 12)"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".43" transform="rotate(60 12 12)"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".57" transform="rotate(90 12 12)"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".71" transform="rotate(120 12 12)"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".86" transform="rotate(150 12 12)"></rect><rect width="2" height="5" x="11" y="1" fill="currentColor" transform="rotate(180 12 12)"></rect><animateTransform attributeName="transform" calcMode="discrete" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;30 12 12;60 12 12;90 12 12;120 12 12;150 12 12;180 12 12;210 12 12;240 12 12;270 12 12;300 12 12;330 12 12;360 12 12"></animateTransform></g></svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 512 512"
                height="80"
                width="80"
              >
                <g transform="translate(0,0)">
                  <path
                    d="M329.8 235.69l62.83-82.71 42.86 32.56-62.83 82.75zm-12.86-9.53l66.81-88-45-34.15-66.81 88zm-27.48-97.78l-19.3 39.57 57-75-42.51-32.3-36.24 47.71zm-20.74-73.24l-46.64-35.43-42 55.31 53.67 26.17zm107 235.52l-139-102.71-9.92.91 4.56 2 62.16 138.43-16.52 2.25-57.68-128.5-40-17.7-4-30.84 39.41 19.42 36.36-3.33 17-34.83-110.9-54.09-80.68 112.51L177.6 346.67l-22.7 145.62H341V372.62l35.29-48.93L387 275.77z"
                    fill="#000000"
                    fill-opacity="1"
                  />
                </g>
              </svg>
            )}
          </div>
          {buttonEnabled ? "Let's Go!" : "Waiting for host to start..."}
        </Button>
        {/* TODO: possibly replace with user's balance and user's total wins*/}
        {/* <div className="mt-10 ">
          {leaderBoard &&
            leaderBoard.map((l, i) => (
              <h3
                key={l[0]}
                className="text-shadow-custom font-sans text-lg text-[#8DFCBC]"
              >{`#${i + 1} ${l[0].slice(0, 6)}...${l[0].slice(l[0].length - 3, l[0].length - 1)}: ${l[1]}`}</h3>
            ))}
        </div> */}
      </div>
      <WaitDialog open={dialogOpen} />
    </>
  );
}
