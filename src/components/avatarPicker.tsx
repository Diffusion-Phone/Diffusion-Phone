"use client";
import { useState } from "react";
import { Button } from "./ui/button";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { snakeToCamel } from "@/lib/utils";
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

export function AvatarPicker() {
  const size = "48";
  const [chosenIndex, setChosen] = useState(0);
  const { initPlayer } = useWorkspace()
  const leftPath =
    "M168 48v160a8 8 0 0 1-13.66 5.66l-80-80a8 8 0 0 1 0-11.32l80-80A8 8 0 0 1 168 48";
  const rightPath =
    "m181.66 133.66l-80 80A8 8 0 0 1 88 208V48a8 8 0 0 1 13.66-5.66l80 80a8 8 0 0 1 0 11.32";

  const prev = () => {
    if (chosenIndex === 0) {
      setChosen(avatars.length - 1);
    } else {
      return setChosen(chosenIndex - 1);
    }
  };
  const next = () => {
    if (chosenIndex === avatars.length - 1) {
      setChosen(0);
    } else {
      setChosen(chosenIndex + 1);
    }
  };
  return (
    <div className="flex w-full flex-col items-center ">
    <div className="flex w-full items-center justify-center">
      <Button
        className="ring-none border-none bg-transparent transition ease-in-out hover:-translate-y-1 hover:scale-110"
        onClick={prev}
      >
        {/* <SvgIcon pathData={leftPath} width={size} height={size} viewBox = {`0 0 ${size} ${size}`}/> */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="120"
          height="120"
          viewBox="0 0 256 256"
        >
          <path
            stroke={"black"}
            stroke-width="6"
            fill="#F9E05A"
            d="M168 48v160a8 8 0 0 1-13.66 5.66l-80-80a8 8 0 0 1 0-11.32l80-80A8 8 0 0 1 168 48"
          ></path>
        </svg>
      </Button>
      <Avatar className="bg-primary h-[175px] w-[175px] rounded-full border-[5px] border-black">
        <AvatarImage src={`/avatars/${avatars[chosenIndex]}`} alt="avatar" />
      </Avatar>
      {/* <SvgIcon pathData={avatarArray[chosenIndex]} width={"100"} height={"100"} /> */}
      <Button
        onClick={prev}
        className="ring-none border-none bg-transparent transition ease-in-out hover:-translate-y-1 hover:scale-110"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="120"
          height="120"
          viewBox="0 0 256 256"
        >
          <path
            stroke={"black"}
            stroke-width="6"
            fill="#F9E05A"
            d="m181.66 133.66l-80 80A8 8 0 0 1 88 208V48a8 8 0 0 1 13.66-5.66l80 80a8 8 0 0 1 0 11.32"
          ></path>
        </svg>
      </Button>
    </div>
    <Button
      className="mt-10 ring-offset-3 flex h-[160px] w-[680px] items-center justify-center rounded-xl text-[56px] italic ring-8 ring-orange-600 ring-offset-black transition ease-in-out hover:-translate-y-1 hover:scale-110 hover:bg-[#f7d726]"
      onClick={() =>
        initPlayer(snakeToCamel(avatars[chosenIndex].split(".")[0]))
      }
    >
      Create Your Account!
    </Button>
    </div>
  );
}
