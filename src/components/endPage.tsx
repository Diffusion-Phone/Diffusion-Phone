'use client';

import { AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { type User } from "@/components/waitRoom";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { Avatar } from "@radix-ui/react-avatar";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useGameState } from "@/contexts/GameStateProvider";
import { useAction } from "@/lib/useAction";

interface Content {
  type: "image" | "story";
  data: string;
  user: User;
}

const columnStyle = "";

export default function EndRoom() {
  const { socket, socketId } = useSocketAuth();
  const router = useRouter();
  const resultRef = useRef<HTMLDivElement>(null);
  const [submitted, setSubmitted] = useState(false);

  const { uploadedImgs, prompt, gameState, isHost, players } = useGameState();
  const { likeDraw, backRoom } = useAction(isHost);

  const [content, setContent] = useState<Content[]>([]);

  useEffect(() => {
    console.log(uploadedImgs, players)
    const allContent = [{ type: "story", data: prompt, user: players[0] }, ...uploadedImgs.map(([publicKey, image]) => {
      return { type: "image", data: image, user: players.filter((p) => p.publicKey == publicKey)[0] }
    })] as Content[];
    console.log(allContent)
    setContent(allContent)
  }, [uploadedImgs])


  useEffect(() => {
    if (socket) {
    }
  }, [socket]);

  useEffect(() => {
    //scroll to bottom with animation
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [content]);

  return (
    <div
      className="z-10 flex w-full flex-col items-center justify-center "
      style={{ height: "calc(100% - 74px)" }}
    >
      <div className="grid h-[80%] min-h-[80%] w-[80%] min-w-[80%] grid-cols-2 items-center space-x-5 rounded-lg border-[3px] border-gray-200 bg-[#370C59] p-5 ">
        <div className="flex h-[648px] w-full flex-col space-y-5">
          <div className="bg-primary rounded-xl border-[5px] border-orange-400">
            <h1 className="font-customs text-shadow-custom text-center text-[50px] text-[#8dfcbc]">
              Image Board
            </h1>
          </div>
          <div className="flex h-full flex-col overflow-y-scroll rounded-xl border-[5px] border-emerald-400 bg-white">
            {content &&
              content
                .filter((c) => c.type === "image")
                .map((c) => (
                  <div
                    key={c.user.socketId}
                    className="m-2 flex items-center justify-between rounded-xl border-[5px] border-black px-3 py-2"
                  >
                    <div className="flex flex-row items-center justify-center">
                      <Avatar className="h-[48px] w-[48px] overflow-hidden rounded-lg">
                        <AvatarImage src={c.user.avatar} alt={c.user.name} />
                      </Avatar>
                      <div>{c.user.name}</div>
                    </div>
                    <button
                      className="items-center justify-center disabled:opacity-50"
                      onClick={() => likeDraw(c.user.publicKey, c.user.socketId)}
                      disabled={!isHost}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 512 512"
                        height={30}
                        width={30}
                      >
                        <defs>
                          <filter
                            id="shadow-1"
                            height="300%"
                            width="300%"
                            x="-100%"
                            y="-100%"
                          >
                            <feFlood
                              flood-color="rgba(10, 251, 251, 1)"
                              result="flood"
                            />
                            <feComposite
                              in="flood"
                              in2="SourceGraphic"
                              operator="atop"
                              result="composite"
                            />
                            <feGaussianBlur
                              in="composite"
                              stdDeviation="15"
                              result="blur"
                            />
                            <feOffset dx="0" dy="0" result="offset" />
                            <feComposite
                              in="SourceGraphic"
                              in2="offset"
                              operator="over"
                            />
                          </filter>
                        </defs>
                        <g transform="translate(0,0)">
                          <path
                            d="M480.25 156.355c0 161.24-224.25 324.43-224.25 324.43S31.75 317.595 31.75 156.355c0-91.41 70.63-125.13 107.77-125.13 77.65 0 116.48 65.72 116.48 65.72s38.83-65.73 116.48-65.73c37.14.01 107.77 33.72 107.77 125.14z"
                            fill="#f9352a"
                            stroke="#19191a"
                            stroke-opacity="1"
                            stroke-width="43"
                            fill-opacity="1"
                            filter="url(#shadow-1)"
                          />
                        </g>
                      </svg>
                    </button>
                  </div>
                ))}
          </div>
        </div>
        {/* <div>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="138" height="138"><g transform="translate(0,0)" ><path d="M387.02 278.627v67.883L477.53 256l-90.51-90.51v67.883H124.98V165.49L34.47 256l90.51 90.51v-67.883h262.04z" fill="#f5ec24" fill-opacity="1" stroke="#fffffb" stroke-opacity="1" stroke-width="20"/></g></svg>
        </div> */}
        <div
          ref={resultRef}
          className="relative flex h-[648px] flex-col overflow-y-scroll rounded-xl border-[5px] border-emerald-400 bg-white"
        >
          {content &&
            content.map((c) => (
              <div className="flex space-y-4 px-4 py-2" key={c.user.socketId}>
                <span className="">{c.user.name}</span>
                <div className="flex overflow-hidden rounded-xl border-[3px] border-black px-2 py-3">
                  {c.type === "image" ? (
                    <Image
                      src={c.data}
                      alt="image"
                      width={100}
                      height={100}
                      className="object-fit"
                    />
                  ) : (
                    <h1 className="">{c.data}</h1>
                  )}
                </div>
              </div>
            ))}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                className={cn(
                  "bg-primary text-shadow-md absolute bottom-2 right-2 hidden rounded-xl px-1 italic ring-[5px] ring-orange-600 hover:bg-[#f7d726]",
                  isHost && "flex",
                )}
                onClick={backRoom}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  width={40}
                  height={40}
                >
                  <g transform="translate(0,0)">
                    <path
                      d="M105 41v398h302V41H105zm55 174c18.1 0 33 14.9 33 33s-14.9 33-33 33-33-14.9-33-33 14.9-33 33-33zm0 18c-8.4 0-15 6.6-15 15s6.6 15 15 15 15-6.6 15-15-6.6-15-15-15zM73 457v30h366v-30H73z"
                      fill="#000000"
                      fill-opacity="1"
                    />
                  </g>
                </svg>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go Back to Room</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// const [content, setContent] = useState<Content[]>([
  // {
  //   type: "story",
  //   data: "A Hugging Face Model",
  //   user: {
  //     socketId: "9",
  //     name: "User 0",
  //     avatar: "https://picsum.photos/200/300",
  //     isHost: true,
  //     publicKey: "123"
  //   }
  // },
  // {
  //   type: "image",
  //   data: "https://picsum.photos/200/300",
  //   user: {
  //     socketId: "8",
  //     name: "User 1",
  //     avatar: "https://picsum.photos/200/300",
  //     isHost: false,
  //     publicKey: "123"
  //   }
  // },
  // {
  //   type: "image",
  //   data: "https://picsum.photos/200/300",
  //   user: {
  //     socketId: "1",
  //     name: "User 2",
  //     avatar: "https://picsum.photos/200/300",
  //     isHost: false,
  //     publicKey: "123"
  //   }
  // },
// ]);

// const onBackRoom = () => {
//   socket?.emit("backRoom");
// };

// const onLike = (publicKey: string, playerId: string) => {
//   socket?.emit("like", publicKey, playerId);
//   setSubmitted(true);
// };
