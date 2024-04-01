'use client';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  FC,
  ReactNode,
} from "react";
import { useSocketAuth } from "./SocketAuthContext";
import { type User } from "@/components/waitRoom";
import { toast } from "sonner";
import { useWorkspace } from "./WorkspaceProvider";
import { Pixelana } from "../../anchor/target/types/pixelana";
import { useWallet } from "@solana/wallet-adapter-react";
import { camelToSnake } from "@/lib/utils";

export interface PlayerInfo {
  balance: number;
  games: number;
  avatar: string;
}

interface GameState {
  players: Array<User>;
  isHost: boolean;
  prompt: string;
  playerInfo?: PlayerInfo;
  uploadedImgs: Array<[string, string]>;
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
            avatar: `/avatars/${Object.keys(player.avatar)[0]}.png`,
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
      const gameState = program.coder.accounts.decode("game", accountInfo.data);
      console.log();
      setGameState({
        ...gameState,
        players: gameState.players,
        isHost: gameState.host,
        prompt: gameState.prompt,
        uploadedImgs: gameState.uploadedImgs,
        gameState: gameState.status,
      });
    });

    // TODO: have to align the type between on chain data and the game state
    const gameListner = provider?.connection.onAccountChange(
      gamePda,
      (account) => {
        const gameState = program.coder.accounts.decode("game", account.data);
        setGameState({
          ...gameState,
          players: gameState.players,
          isHost: gameState.host,
          prompt: gameState.prompt,
          uploadedImgs: gameState.uploadedImgs,
          gameState: gameState.status,
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
