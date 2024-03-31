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
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

// TODO: Would disable this and switch to useAnchorProgram
export const useAction = (host = false) => {
  const { socket } = useSocketAuth();
  const { isHost, gameState } = useGameState();

  const joinGame = useCallback(() => {
    if (socket) {
      socket.emit("addPlayer");
    }
  }, [socket]);

  const startGame = useCallback(() => {
    if (socket) {
      console.log(isHost, gameState);
      socket.emit("startGame");
    }
  }, [socket]);

  const endGame = useCallback(() => {
    if (socket) {
      socket.emit("endGame");
    }
  }, [socket]);

  const submitPrompt = useCallback(
    (playerId: string, prompt: string) => {
      if (socket) {
        socket.emit("submitPrompt", playerId, prompt);
      }
    },
    [socket]
  );

  const submitDrawing = useCallback(
    (playerId: string, drawing: string) => {
      if (socket) {
        socket.emit("submitDraw", playerId, drawing);
      }
    },
    [socket]
  );

  const likeDraw = useCallback(
    (playerId: string, socketId: string) => {
      if (socket) {
        socket.emit("likeDrawing", playerId, socketId);
      }
    },
    [socket]
  );

  const backRoom = useCallback(() => {
    if (socket) {
      socket.emit("backRoom");
    }
  }, [socket]);

  return {
    joinGame,
    startGame,
    endGame,
    submitPrompt,
    submitDrawing,
    likeDraw,
    backRoom,
  };
};

//TODO: add a parameter: isHost to make sure he could access the host actions
export function useAnchorProgram() {
  const { gamePda } = useWorkspace();
  const { gameState, isHost } = useGameState();
  const {} = useWallet();
  const { provider, program } = useWorkspace();

  // if (!provider || !program || !gamePda) {
  //   throw new Error("Workspace not initialized");
  // }

  const getGameAccount = useQuery({
    queryKey: ["game"],
    queryFn: () => program.account.game.fetch(gamePda),
  });

  const mutateDeposit = useMutation({
    mutationFn: ({ amount }: { amount: number }) =>
      depositToVault({ provider, program, amount }),
  });

  const mutateStartGame = useMutation({
    mutationFn: () => startGame({ provider, program, gamePda }),
  });

  const mutateSubmitStory = useMutation({
    mutationFn: ({ story }: { story: string }) =>
      submitStory({ provider, program, gamePda, story }),
  });

  const mutateSubmitImage = useMutation({
    mutationFn: ({ image }: { image: string }) =>
      submitImage({ provider, program, gamePda, image }),
  });

  const mutateSelectWinner = useMutation({
    mutationFn: ({ winner }: { winner: number }) =>
      selectWinner({ provider, program, gamePda, winner }),
  });

  const mutateGenerateImage = useMutation({
    mutationFn: (prompt: string) =>
      generateImage({ provider, program, gamePda, prompt }),
  });

  const mutateMintNft = useMutation({
    mutationFn: (winner: { participant: PublicKey; drawingRef: string }) =>
      mintNft({ provider, program, gamePda, winner }),
  });

  return {
    getGameAccount,
    mutateDeposit,
    mutateStartGame,
    mutateSubmitStory,
    mutateSubmitImage,
    mutateSelectWinner,
    mutateGenerateImage,
    mutateMintNft,
  };
}

export async function initializeGame({
  provider,
  program,
  roomId,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  roomId: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  const payer = provider.wallet;
  const [hostPda, hostBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );
  const [gamePda, gameBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(roomId)],
    program.programId
  );
  await program.methods
    .initializeGame(roomId)
    .accounts({
      payer: payer.publicKey,
      game: gamePda,
      host: hostPda,
    })
    .rpc()
    .then((res) => {
      console.log("init game tx:", res);
    })
    .catch((err) => {
      console.error("init game error:", err);
    });
}

export async function initialUser({
  provider,
  program,
  avatar,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  avatar: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  const payer = provider.wallet;
  const [playerPda, playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );
  const playerArg: Record<string, unknown> = {};
  playerArg[avatar] = {};
  console.log("playerArg", playerArg);
  const player = await program.methods
    // TODO: fix the type here
    .initializePlayer(playerArg as any)
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
  return playerPda;
}

export async function joinGame({
  provider,
  program,
  roomId,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  roomId: string;
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  const payer = provider.wallet;
  const [gamePda, gameBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("game"), Buffer.from(roomId)],
    program.programId
  );
  const [playerPda, playerBump] = PublicKey.findProgramAddressSync(
    [Buffer.from("player"), payer.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .joinGame()
    .accounts({
      payer: payer.publicKey,
      game: gamePda,
      player: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("join game tx:", res);
    })
    .catch((err) => {
      console.error("join game error:", err);
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

  program.methods
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

  return program.methods
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

  return program.methods
    .deductBalance(new anchor.BN(1 * LAMPORTS_PER_SOL))
    .accounts({
      player: playerPda,
    })
    .rpc()
    .then((res) => {
      console.log("generate prompt tx:", res);
      //TODO: change to our modal model
      return fetch("https://api.openai.com/v1/engines/davinci/completions");
    })
    .then((res) => res.blob())
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
  winner: number;
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
  return program.methods
    .selectWinner(winner)
    .accounts({
      game: gamePda,
      host: playerPda,
    })
    .rpc()
    .then(async (res) => {
      console.log("select winner tx:", res);
      //TODO: change to our modal model
    })
    .catch((err) => {
      console.error("select winner error:", err);
    });
}

export async function mintNft({
  provider,
  program,
  gamePda,
  winner,
}: {
  provider: AnchorProvider;
  program: Program<Pixelana>;
  gamePda: PublicKey;
  winner: { participant: PublicKey; drawingRef: string };
}) {
  if (!provider || !program) {
    throw new Error("Wallet not connected");
  }
  if (!gamePda) {
    throw new Error("Game not initialized");
  }

  let mint = new Keypair();
  const destinationTokenAccount = getAssociatedTokenAddressSync(
    mint.publicKey,
    winner.participant,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const nft_authority = await PublicKey.findProgramAddressSync(
    [Buffer.from("nft_authority")],
    program.programId
  );

  return program.methods
    .mintNft()
    .accounts({
      game: gamePda,
      systemProgram: anchor.web3.SystemProgram.programId,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenAccount: destinationTokenAccount,
      mint: mint.publicKey,
      nftAuthority: nft_authority[0],
      host: provider.wallet.publicKey,
    })
    .rpc()
    .then(async (res) => {
      console.log("mint nft tx:", res);
    })
    .catch((err) => {
      console.error("mint nft error:", err);
    });
}
