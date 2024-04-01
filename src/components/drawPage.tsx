'use client';
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useGameState } from "@/contexts/GameStateProvider";
import { submitImage as submitImageFn, generateImage as generateImageFn} from "@/lib/useAction";
import { useMutation } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceProvider";

function FinishDialog({ open }: { open: boolean }) {
  return (
    <Dialog open={open}>
      <DialogContent className="bg-secondary">
        <DialogHeader>
          <DialogTitle className="font-sans text-white">
            Waiting for other users to finish
          </DialogTitle>
          <DialogDescription className="font-sans text-white">
            Please wait for the other users to finish their turn!
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

const buttonStyle =
  "rounded-xl italic ring-[5px] ring-orange-600 hover:bg-[#f7d726] text-shadow-md";
const inputStyle =
  "flex-1 border ring-orange-600 ring-[5px] rounded-lg focus-visible:ring-emerald-600 focus-visible:ring-[5px]";

export default function DrawRoom() {
  const { socket } = useSocketAuth();
  const { provider, program, gamePda } = useWorkspace();
  // received content, either image or story
  const [receivedPrompt, setPrompt] = useState<string | null>(null);
  const [aiPrompt, setAIPrompt] = useState<string>("");
  // the AI image
  const [aiImage, setAiImage] = useState<string | null>(null);
  // is the AI generating the image
  // has the user submitted their content
  const [submitted, setSubmitted] = useState(false);
  // duration of the round
  const [timeLeft, setTimeLeft] = useState(60);
  const { prompt } = useGameState();


  const generateIamge = useMutation({
    mutationFn: async (prompt: string) => {
      await generateImageFn({ provider, program, gamePda, prompt})
    },
    onSuccess: (image) => {
      setAiImage(image as any);
    }
  })

  const submitImage = useMutation({
    mutationFn: async (image: string) => {
      await submitImageFn({ provider, program, gamePda, image });
    },
    onSuccess: () => {
      setSubmitted(true);
    }
  })

  useEffect(() => {
    // Exit early when we reach 0
    if (!timeLeft) {
      submitImage.mutate(aiImage || "/404.png");
    }

    // Save intervalId to clear the interval when the component re-renders
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);

    // Clear interval on re-render to avoid memory leaks
    return () => clearInterval(intervalId);
    // Add timeLeft as a dependency to re-run the effect
    // when we update it
  }, [timeLeft]);

  return (
    <>
      <div
        className="z-10 flex w-full flex-col items-center justify-center "
        style={{ height: "calc(100% - 74px)" }}
      >
        <div className="flex h-[80%] min-h-[80%] w-[80%] min-w-[80%] flex-col items-center justify-center space-y-3 rounded-lg border-[3px] border-gray-200 bg-[#370C59] p-5">
          <h1 className="font-customs text-shadow-custom text-[50px] text-[#8dfcbc]">
            Make Story Come True
          </h1>
          <h1 className="text-shadow-md text-xl text-yellow-300">
            Prompt: {prompt}
          </h1>
          {/* Ensure Image component fills the container or consider a wrapper */}
          <div className="h-[500px] w-[500px] rounded-xl border-[5px] border-black">
            {aiImage ? (
              <Image
                src={aiImage}
                alt="image"
                width={500}
                height={500}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white">
                Input your Prompt to Generate Image
              </div>
            )}
          </div>
          <h1
            className={cn(
              "text-shadow-md text-xl text-white",
              timeLeft < 20 && "text-yellow-300",
            )}
          >
            Time Remaining: {timeLeft}
          </h1>
          <div className="flex w-[80%] space-x-5">
            <Input
              className={inputStyle}
              value={aiPrompt}
              onChange={(e) => {
                setAIPrompt(e.currentTarget.value);
              }}
            />
            <Button
              className={buttonStyle}
              onClick={(e) => {generateIamge.mutate(aiPrompt)}}
              disabled={generateIamge.status === "pending"}
            >
              Generate
            </Button>
            <Button
              className={buttonStyle}
              onClick={(e) => {
                e.preventDefault();
                submitImage.mutate(aiImage!);
              }}
            >
              Submit
            </Button>
          </div>
        </div>
      </div>
      <FinishDialog open={submitted} />
    </>
  );
}

// 500 x 500
