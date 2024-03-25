"use client";

import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useGameState } from "@/contexts/GameStateProvider";
import { useSocketAuth } from "@/contexts/SocketAuthContext";
import { useCallback } from "react";
import { IDL, Pixelana } from "../../anchor/target/types/pixelana";
import { useMutation, useQuery } from "@tanstack/react-query";
import { programId } from "@/lib/constant";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

//TODO: add a parameter: isHost to make sure he could access the host actions
export function useAnchorProgram() {
  const { gameState, isHost, gamePda } = useGameState();
  const {} = useWallet();
  const { provider, program } = useWorkspace();

  if (!provider || !program) {
    throw new Error("Workspace not initialized");
  }

  const getGameAccount = useQuery({
    queryKey: ["game"],
    queryFn: () => program.account.game.fetch(gamePda),
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

export async function initialUser({
  provider,
  program,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  const payer = provider.wallet;
  const [playerPda, playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  const player = await program.methods
    .initializePlayer()
    .accounts({
      payer: payer.publicKey,
      player: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("init player tx:", res);
    })
    .catch((err) => {
      console.error("init player error:", err);
    });
}

export async function depositToVault({
  provider,
  program,
  amount,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  amount: number;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  const payer = provider.wallet;
  const [playerPda, playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );
  // FIXME:
  const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  await program.methods
    .depositToVault(new anchor.BN(amount * LAMPORTS_PER_SOL))
    .accounts({
      depositor: payer.publicKey,
      vault: vaultPda,
      player: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("deposit to vault tx:", res);
    })
    .catch((err) => {
      console.error("deposit to vault error:", err);
    });
}

export async function startGame({
  provider,
  program,
  gamePda,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  if (!gamePda) {
    throw new Error("Game not initialized");
  }
  const payer = provider.wallet;
  const [playerPda, _playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .startGame()
    .accounts({
      game: gamePda,
      host: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("init game tx:", res);
    })
    .catch((err) => {
      console.error("init game error:", err);
    });
}

export async function submitStory({
  provider,
  program,
  gamePda,
  story,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
  story: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  if (!gamePda) {
    throw new Error("Game not initialized");
  }
  const payer = provider.wallet;
  const [playerPda, _playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .submitStory(story)
    .accounts({
      game: gamePda,
      host: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("submit story tx:", res);
    })
    .catch((err) => {
      console.error("submit story error:", err);
    });
}

export async function submitImage({
  provider,
  program,
  gamePda,
  image,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
  image: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  if (!gamePda) {
    throw new Error("Game not initialized");
  }
  const payer = provider.wallet;
  const [playerPda, _playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .submitDrawing(image)
    .accounts({
      game: gamePda,
      participant: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("submit story tx:", res);
    })
    .catch((err) => {
      console.error("submit story error:", err);
    });
}

export async function generateImage({
  provider,
  program,
  gamePda,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
  prompt: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  if (!gamePda) {
    throw new Error("Game not initialized");
  }
  const payer = provider.wallet;
  const [playerPda, _playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  const [vaultPda, _vaultBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    program.programId
  );

  return await program.methods
    .deductBalance(new anchor.BN(1 * LAMPORTS_PER_SOL))
    .accounts({
      player: playerPda,
    })
    .rpc()
    .then(async (res) => {
      console.log("generate prompt tx:", res);
      //TODO: change to our modal model
      return await fetch(
        "https://api.openai.com/v1/engines/davinci/completions"
      ).then((res) => {
        return res.json();
      });
    })
    .catch((err) => {
      console.error("generate prompt error:", err);
    });
}

export async function selectWinner({
  provider,
  program,
  gamePda,
  winner,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
  winner: string;
}) {
  return;
}