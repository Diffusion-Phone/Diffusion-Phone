'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
  ReactNode,
} from "react";
import { toast } from "sonner";
import { useWorkspace } from "./WorkspaceProvider";
import { useWallet } from "@solana/wallet-adapter-react";
import { camelToSnake } from "@/lib/utils";
import { type PublicKey } from "@solana/web3.js";

export interface PlayerInfo {
  balance: number;
  games: number;
  avatar: string;
}

export interface Drawing {
  participant: PublicKey,
  drawingRef: string;
}

interface GameState {
  players: Array<PublicKey>;
  isHost: boolean;
  prompt: string;
  playerInfo?: PlayerInfo;
  uploadedImgs: Array<Drawing>;
  winningDrawing?: Drawing;
  gameState:
    | "none"
    | "waitingForParticipants"
    | "waitingForStory"
    | "waitingForDrawings"
    | "selectingWinner"
    | "waitingForMinting"
    | "completed";
}

const defaultGameState: GameState = {
  players: [],
  isHost: false,
  prompt: "",
  uploadedImgs: [],
  gameState: "none",
};

const GameStateContext = createContext<GameState>(defaultGameState);

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { gamePda, program, provider, playerPda } = useWorkspace();
  const wallet = useWallet();

  const [gameState, setGameState] = useState<GameState>(defaultGameState);
  useEffect(() => {
    if (!provider || !program || !wallet.publicKey || !playerPda) {
      return;
    }

    provider?.connection.getAccountInfo(playerPda).then((accountInfo) => {
      if (!accountInfo) {
        console.log("No player account found, creating one now");
        setGameState({
          ...gameState,
          playerInfo: undefined
        });
        return;
      }
      const player = program.coder.accounts.decode("player", accountInfo.data);
      console.log(camelToSnake(Object.keys(player.avatar)[0]));
      setGameState({
        ...gameState,
        playerInfo: {
          balance: player.balance.toNumber() / 1000000000,
          games: player.games.toNumber(),
          avatar: `/avatars/${camelToSnake(Object.keys(player.avatar)[0])}.png`,
        },
      });
    });

    const playerListner = provider?.connection.onAccountChange(
      playerPda,
      (account) => {
        console.log("player account", account);
        if (!account.data) {
          return;
        }
        const player = program.coder.accounts.decode("player", account.data);
        console.log(player);
        setGameState({
          ...gameState,
          playerInfo: {
            balance: player.balance,
            games: player.games,
            avatar: `/avatars/${camelToSnake(Object.keys(player.avatar)[0])}.png`,
          },
        });
      }
    );

    return () => {
      provider.connection.removeAccountChangeListener(playerListner);
    };
  }, [provider, program, wallet, playerPda]);

  useEffect(() => {
    if (!provider || !program || !wallet.publicKey || !gamePda) {
      return;
    }

    provider?.connection.getAccountInfo(gamePda).then((accountInfo) => {
      if (!accountInfo) {
        return;
      }
      const newGameState = program.coder.accounts.decode("game", accountInfo.data);
      console.log(newGameState);
      setGameState({
        ...gameState,
        players: [newGameState.host, ...newGameState.participants],
        isHost: gameState.isHost ?? newGameState.host.equals(wallet.publicKey),
        prompt: gameState.prompt,
        uploadedImgs: gameState.uploadedImgs,
        gameState: Object.keys(newGameState.status)[0] as GameState["gameState"],
      });
    });

    // TODO: have to align the type between on chain data and the game state
    const gameListner = provider?.connection.onAccountChange(
      gamePda,
      (account) => {
        const newGameState = program.coder.accounts.decode("game", account.data);
        if (newGameState.winningDrawing && !gameState.winningDrawing) {
          toast.success("The winner has been selected!: " + newGameState.winningDrawing.participant.toBase58());
        }
        setGameState({
          ...gameState,
          players: [newGameState.host, ...newGameState.participants],
          isHost: gameState.isHost ?? newGameState.host.equals(wallet.publicKey),
          prompt: gameState.prompt,
          uploadedImgs: gameState.uploadedImgs,
          winningDrawing: gameState.winningDrawing,
          gameState: Object.keys(newGameState.status)[0] as GameState["gameState"],
        });
      }
    );
    return () => {
      provider.connection.removeAccountChangeListener(gameListner);
    };
  }, [gamePda, provider, program]);

  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
};
