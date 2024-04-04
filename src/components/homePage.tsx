'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "./ui/input";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useGameState } from "@/contexts/GameStateProvider";
import { AvatarPicker } from "./avatarPicker";

function JoinRoomDialog({
  onClick,
  children,
}: {
  onClick: (roomId: string) => void;
  children?: React.ReactNode;
}) {
  const [roomId, setRoomId] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-secondary justify-center flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-sans text-white">
            Enter The Room Id to Join
          </DialogTitle>
        </DialogHeader>
        <Input
          value={roomId}
          onInput={(e) => {
            setRoomId(e.currentTarget.value);
          }}
        />
        <Button
          className="rounded-xl italic ring-[5px] ring-orange-600 hover:bg-[#f7d726] text-shadow-md"
          onClick={() => onClick(roomId)}
        >
          Submit
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function HomePage() {
  const { initGame: initGameFn, joinGame: joinGameFn} = useWorkspace();

  const joinGame = useMutation({
    mutationFn: async (roomId: string) => {
      await joinGameFn(roomId);
    },
  });
  const initGame = useMutation({
    mutationFn: async () => {
      await initGameFn();
    },
  })
  const { playerInfo } = useGameState();
  return (
    <div className="w-[1082px] h-[698px] absolute border-4 border-gray-300 shadow-inner rounded-lg left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 lg:scale-95 md:scale-90 sm:scale-[0.6]">
      <div className="flex h-full flex-col items-center justify-center space-y-10">
        <h1 className="font-customs text-shadow-custom text-[50px] text-[#8DFCBC]">
          PixeLana
        </h1>
        {playerInfo ? (
          <>
            <div className="flex w-full items-center justify-center "></div>
            <Avatar className="bg-primary h-[175px] w-[175px] rounded-full border-[5px] border-black">
              <AvatarImage src={playerInfo.avatar} alt="avatar" />
            </Avatar>
            <div className="items-center justify-center flex flex-row gap-10">
              <Button
                className="ring-offset-3 flex h-[80px] w-[200px] items-center justify-center rounded-xl text-[32px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]"
                onClick={() => initGame.mutate()}
                disabled={initGame.status === "pending"}
              >
                New Game!
              </Button>
              <JoinRoomDialog
                onClick={(roomId) => {
                  joinGame.mutate(roomId);
                }}
              >
                <Button className="ring-offset-3 flex h-[80px] w-[200px] items-center justify-center rounded-xl text-[32px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]" disabled={joinGame.status === "pending"}>
                  Join!
                </Button>
              </JoinRoomDialog>
            </div>
          </>
        ) : (
          <AvatarPicker />
        )}
        {playerInfo && (
          <JoinRoomDialog onClick={() => {}}>
            <button className="underline">Back To A Game</button>
          </JoinRoomDialog>
        )}
      </div>
    </div>
  );
}
