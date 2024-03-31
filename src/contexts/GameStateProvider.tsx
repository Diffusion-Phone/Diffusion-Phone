'use client'
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
import { PublicKey } from "@solana/web3.js";

export interface PlayerInfo {
  balance: number;
  games: number;
  avatar: string;
};

interface GameState {
  players: Array<User>;
  isHost: boolean;
  prompt: string;
  playerInfo?: PlayerInfo,
  uploadedImgs: Array<[string, string]>;
  gameState:
    | "none"
    // | "init"
    | "waitingForPlayers"
    | "waitingForPrompt"
    | "waitingForDraw"
    | "ended";
  leaderBoard: Array<[string, string]>;
}

const defaultGameState: GameState = {
  players: [],
  isHost: false,

  prompt: "",
  uploadedImgs: [],
  gameState: "none",
  leaderBoard: [],
};

const GameStateContext = createContext<GameState>(defaultGameState);

export const useGameState = () => useContext(GameStateContext);

export const GameStateProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  // TODO: listen to the game state change from the game account, remove all socket thing

  const {gamePda, program, provider} = useWorkspace();
  const  wallet  = useWallet();
  const [gameState, setGameState] = useState<GameState>(defaultGameState);

  // TODO: should fully remove this socket provider 
  // const { socket } = useSocketAuth();

  useEffect(() => {

    if (!provider ||  !program || !wallet.publicKey) {
      return;
    }

    const [playerPda, _] = PublicKey.findProgramAddressSync([Buffer.from("player"), wallet.publicKey.toBuffer()], program.programId)
    // provider?.connection.getAccountInfo(playerPda).then((accountInfo) => {
    //   if (!accountInfo) {
    //     return
    //   }
    //   const player = program.coder.accounts.decode('Player', accountInfo.data)
    //   setGameState({
    //     ...gameState,
    //     playerInfo: {
    //       balance: player.balance,
    //       games: player.games,
    //       avatar: `/avatars/${Object.keys(player.avatar)[0]}`,
    //     },
    //   })
    //   });
    
    const playerListner = provider?.connection.onAccountChange(playerPda, (account) => {
      console.log("player account", account)
      if (!account.data) {
        return
      }
      const player = program.coder.accounts.decode('player', account.data)
      console.log(player)
      setGameState({
        ...gameState,
        playerInfo: {
          balance: player.balance,
          games: player.games,
          avatar: `/avatars/${Object.keys(player.avatar)[0]}.png`,
        },
      });
    })

    if (!gamePda) {
      return () => {
        provider.connection.removeAccountChangeListener(playerListner)
      };
    }


    // TODO: have to align the type between on chain data and the game state
    const gameListner = provider?.connection.onAccountChange(gamePda, (account) => {
      const gameState = program.coder.accounts.decode('game', account.data)
      setGameState({
        ...gameState,
        players: gameState.players,
        isHost: gameState.isHost,
        prompt: gameState.prompt,
        uploadedImgs: gameState.uploadedImgs,
        gameState: gameState.gameState,
        leaderBoard: gameState.leaderBoard,
      });
    })

    return () => {
      provider.connection.removeAccountChangeListener(gameListner)
      provider.connection.removeAccountChangeListener(playerListner)
    }
  }, [gamePda, provider, program, wallet])


  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
};
