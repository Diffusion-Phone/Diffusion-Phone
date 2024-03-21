'use client';

import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useGameState } from "@/contexts/GameStateProvider";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useCallback } from "react";
import { IDL } from "../../anchor/target/types/pixelana";
import { useMutation, useQuery } from '@tanstack/react-query';
import { programId } from "@/lib/constant";
import { Program } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

//TODO: add a parameter: isHost to make sure he could access the host actions
export function useAnchorProgram() {
  const { gameState, isHost, gamePda} = useGameState();
  const {} = useWallet()
  const {provider, program } = useWorkspace();

  if (!provider || !program) {
    throw new Error("Workspace not initialized");
  }

  const getGameAccount = useQuery({
    queryKey: ["game"],
    queryFn: () => program.account.game.fetch(gamePda)
  });

  // const intializeUser = useMutation({
  //   mutationFn: ({playerPub, playerPda}: {playerPub: PublicKey, playerPda: PublicKey}) => program.methods.initializePlayer().accounts({
  //     player: playerPda,
  //     payer: playerPub
  //   }).rpc(),
  // });

  // const intializeGame = useMutation({
  //   mutationFn: () => program.methods.initializeGame().accounts({
  //     game: gamePda,

  //   }).rpc()
  // });

}


export async function initialUser() {

  // const payer = provider.wallet;
  // const [playerPda, playerBump] = PublicKey.findProgramAddressSync([Buffer.from("player"), payer.publicKey.toBuffer()], program.programId);
}