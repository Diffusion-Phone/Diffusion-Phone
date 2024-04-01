import { useGameState } from "@/contexts/GameStateProvider";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { useWallet } from "@solana/wallet-adapter-react";
import { type PublicKey } from "@solana/web3.js";


export interface User {
  socketId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  publicKey: string;
}

interface RoomProps {
  users: PublicKey[];
}

export function UserCard({ user }: { user: PublicKey }) {
  const keyString = user.toString();
  const wallet = useWallet();
  const {playerInfo} = useGameState();  
  return (
    <div className="flex flex-col items-center justify-center rounded-lg m-2">
      <Avatar className="w-[100px] h-[100px] border-[5px] border-black p-2 rounded-lg bg-yellow-300">
        <AvatarImage src={user.equals(wallet.publicKey!) ? playerInfo?.avatar : ""} />
        <AvatarFallback>
          <svg xmlns="http://www.w3.org/2000/svg" width={100} height={100} viewBox="0 0 24 24"><path fill="currentColor" d="M13 22h-3v-3h3v3Zm0-5h-3v-.007c0-1.65 0-3.075.672-4.073a6.304 6.304 0 0 1 1.913-1.62c.334-.214.649-.417.914-.628a3.712 3.712 0 0 0 1.332-3.824A3.033 3.033 0 0 0 9 8H6a6 6 0 0 1 6-6a6.04 6.04 0 0 1 5.434 3.366a6.017 6.017 0 0 1-.934 6.3c-.453.502-.96.95-1.514 1.337a7.248 7.248 0 0 0-1.316 1.167A4.23 4.23 0 0 0 13 17Z"></path></svg>
        </AvatarFallback>
      </Avatar>
      <h3>{`${keyString.slice(0,6)}...${keyString.slice(keyString.length-3)}`}</h3>
    </div>
  )
} 


export function Room({ users }: RoomProps) {
  
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="font-customs text-[50px] text-shadow-custom text-[#8DFCBC]">Room</h1>
      <h2 className="text-shadow sm:text-shadow-sm md:text-shadow-md lg:text-shadow-lg xl:text-shadow-xl">PLAYERS: {users.length}/7 </h2>
      <div className="flex flex-row border-[5px] w-full border-black rounded-lg overflow-x-auto">
        {users.map((userKey) => (
          <UserCard user={userKey} key={userKey.toString()}/>
        ))}
        {[...Array(7 - users.length)].map((_, i) => (

        <div key={i} className="flex flex-col items-center justify-center rounded-lg mx-2">
          <div className="flex rounded-lg border-[5px] border-black border-dashed bg-yellow-300 w-[100px] h-[100px] overflow-hidden items-center justify-center opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={100} height={100}><g transform="translate(0,0)" ><path d="M250.882 22.802c-23.366 3.035-44.553 30.444-44.553 65.935 0 19.558 6.771 36.856 16.695 48.815l11.84 14.263-18.217 3.424c-12.9 2.425-22.358 9.24-30.443 20.336-8.085 11.097-14.266 26.558-18.598 44.375-7.843 32.28-9.568 71.693-9.842 106.436h42.868l11.771 157.836c29.894 6.748 61.811 6.51 90.602.025l10.414-157.86h40.816c-.027-35.169-.477-75.126-7.584-107.65-3.918-17.934-9.858-33.372-18.04-44.343-8.185-10.97-18.08-17.745-32.563-19.989l-18.592-2.88 11.736-14.704c9.495-11.897 15.932-28.997 15.932-48.082 0-37.838-23.655-65.844-49.399-65.844z" fill="#000000" fill-opacity="1"/></g></svg>
          </div>
            <h3>User X</h3>
      </div>
      ))}
    </div>
    </div>
  )

}