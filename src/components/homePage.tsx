'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SvgIcon } from "@/components/customSvg";
import { Button } from "./ui/button";
import { useState } from "react";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
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
import { join } from "path";
import { useQuery } from "@tanstack/react-query";
import { PublicKey } from "@solana/web3.js";
import { useGameState } from "@/contexts/GameStateProvider";
import { AvatarPicker } from "./avatarPicker";

function JoinRoomDialog({ onClick }: { onClick: (roomId: string) => void }) {
  const [roomId, setRoomId] = useState("");
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="ring-offset-3 flex h-[80px] w-[200px] items-center justify-center rounded-xl text-[32px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]">
          Join!
        </Button>
      </DialogTrigger>
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

const avatars = [
  "life-in-the-balance.png",
  "pierced-heart.png",
  "haunting.png",
  "skeletal-hand.png",
  "sarcophagus.png",
  "spectre.png",
  "slipknot.png",
  "shambling-zombie.png",
  "oni.png",
  "telefrag.png",
  "morgue-feet.png",
  "decapitation.png",
  "dead-head.png",
  "anubis.png",
  "ghost.png",
  "scythe.png",
  "graveyard.png",
  "reaper-scythe.png",
  "drowning.png",
  "internal-injury.png",
  "prayer.png",
  "dead-eye.png",
  "resting-vampire.png",
  "guillotine.png",
  "tombstone.png",
  "dead-wood.png",
  "pirate-grave.png",
  "coffin.png",
  "carrion.png",
  "egyptian-urns.png",
  "grave-flowers.png",
  "grim-reaper.png",
  "executioner-hood.png",
  "maggot.png",
];

const genRandomName = () => {
  let randomName = "";
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomName += characters[randomIndex];
  }
  return randomName;
};

export function HomePage() {
  const {initGame, joinGame} = useWorkspace()
  const { playerInfo } = useGameState()
  const [name, setName] = useState(genRandomName());
  const size = "48";
  return (
    <div className="w-[1082px] h-[698px] absolute border-4 border-gray-300 shadow-inner rounded-lg left-[50%] top-[50%] -translate-x-1/2 -translate-y-1/2 lg:scale-95 md:scale-90 sm:scale-[0.6]">
      <div className="flex h-full flex-col items-center justify-center space-y-10">
        <h1 className="font-customs text-shadow-custom text-[50px] text-[#8DFCBC]">
          PixeLana
        </h1>
        {playerInfo ? <>
        <div className="flex w-full items-center justify-center ">
        </div>
        <div className="bg-primary ring-offset-background relative flex h-[50px] w-[250px] items-center rounded-lg border-[4px] border-black px-3 py-2 text-sm">
          <div className="flex w-full text-lg">
            <span className="font-sans ">{name}</span>
          </div>
          <div
            className="absolute right-1"
            onClick={() => setName(genRandomName())}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="1.5em"
              height="1.25em"
              viewBox="0 0 640 512"
            >
              <path
                fill="currentColor"
                d="M274.9 34.3c-28.1-28.1-73.7-28.1-101.8 0L34.3 173.1c-28.1 28.1-28.1 73.7 0 101.8l138.8 138.8c28.1 28.1 73.7 28.1 101.8 0l138.8-138.8c28.1-28.1 28.1-73.7 0-101.8zM200 224a24 24 0 1 1 48 0a24 24 0 1 1-48 0M96 200a24 24 0 1 1 0 48a24 24 0 1 1 0-48m128 176a24 24 0 1 1 0-48a24 24 0 1 1 0 48m128-176a24 24 0 1 1 0 48a24 24 0 1 1 0-48m-128-80a24 24 0 1 1 0-48a24 24 0 1 1 0 48m96 328c0 35.3 28.7 64 64 64h192c35.3 0 64-28.7 64-64V256c0-35.3-28.7-64-64-64H461.7c11.6 36 3.1 77-25.4 105.5L320 413.8zm160-120a24 24 0 1 1 0 48a24 24 0 1 1 0-48"
              ></path>
            </svg>
          </div>
        </div>
        <div className="items-center justify-center flex flex-row gap-10">
          <Button
            className="ring-offset-3 flex h-[80px] w-[200px] items-center justify-center rounded-xl text-[32px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]"
            onClick={() =>
              initGame()
            }
          >
            New Game!
          </Button>
          <JoinRoomDialog
            onClick={(roomId) => {
              joinGame(roomId)
            }}
          />
        </div>
        </> : <AvatarPicker />}
      </div>
    </div>
  );
}
