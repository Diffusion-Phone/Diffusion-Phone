'use client';
import {
  AnchorWallet,
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor";
import { programId } from "@/lib/constant";
// import IDL from "../../anchor/target/idl/pixelana.json"
import { Pixelana, IDL } from "../../anchor/target/types/pixelana";
import { joinGame as anchorJoinGame, initializeGame, initialUser} from "@/lib/useAction";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { PublicKey } from "@solana/web3.js";
import { generateRandomString } from "@/lib/utils";
import { toast } from "sonner";

// Define the structure of the Program context state
type WorkspaceProvider = {
  program?: Program<Pixelana>;
  provider?: AnchorProvider;
  gamePda?: PublicKey;
  roomId?: string;
  playerPda?: PublicKey;
  joinGame: (roomId: string) => Promise<void>;
  initGame: () => Promise<void>;
  initPlayer: (avatar: string) => Promise<void>;
};

// Create the context with default values
const WorkspaceContext = createContext<WorkspaceProvider>({
  joinGame: async (roomId: string) => {},
  initGame: async () => {},
  initPlayer: async () => {},
});

// Custom hook to use the Program context
export const useWorkspace = () => useContext(WorkspaceContext);

// Provider component to wrap around components that need access to the context
export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();

  // State variable to hold the program instance
  const [program, setProgram] = useState<Program<Pixelana>>();
  const [provider, setProviderInner] = useState<AnchorProvider>();
  const [gamePda, setGamePda] = useState<PublicKey>();
  const [playerPda, setPlayerPda] = useState<PublicKey>();
  const [roomId, setRoomId] = useState<string>();


  // Anchor program setup
  const setup = useCallback(async () => {
    /// @ts-ignore
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {
      commitment: "confirmed",
    });
    setProvider(provider);
    setProviderInner(provider);
    const program = new Program<Pixelana>(IDL, programId, provider);

    setProgram(program);
  }, [connection, wallet]);

  // Effect to fetch program when the component mounts
  useEffect(() => {
    setup();
  }, [setup]);


  useEffect(() => {
    if (!wallet?.publicKey || !program || !provider) {
      return 
    }
    const [playerPDA, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("player"), wallet.publicKey.toBuffer()],
      program?.programId
    );

    setPlayerPda(playerPDA);
  }, [program, provider, wallet])

  const joinGame = useCallback(
    async (roomId: string) => {
      if (!program || !provider) {
        return;
      }
      const [gamePDA, _] = PublicKey.findProgramAddressSync(
        [Buffer.from("game"), Buffer.from(roomId)],
        program.programId
      );
      await anchorJoinGame({ program, provider, roomId }).then(() => {
        setGamePda(gamePDA);
        setRoomId(roomId);
      });
    },
    [program, provider]
  );

  const initGame = useCallback(async () => {
    if (!program || !provider ) {
      toast.error("Program or provider not found");
      return 
    }
    if (!playerPda) {
      toast.error("Player not found");
      return 
    }
    const roomId = generateRandomString(8);
    const [gamePDA, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("game"), Buffer.from(roomId)],
      program.programId
    );
    await initializeGame({ program, provider, roomId }).then(() => {
      setRoomId(roomId);
      setGamePda(gamePDA);
    })
  }, [program, provider, playerPda]);

  const initPlayer = useCallback(async (avatar: string) => {
    if (!program || !provider) {
      toast.error("Program or provider not found");
      return;
    }
    try {
      const playerPDA = await initialUser({ program, provider, avatar})
      console.log("playerPDA", playerPDA)
      setPlayerPda(playerPDA);
    } catch (error) {
      console.log(error)
    }
  }, [program, provider]);

  return (
    <WorkspaceContext.Provider value={{ program, provider, gamePda, playerPda, joinGame, initGame, initPlayer, roomId}}>
      {children}
    </WorkspaceContext.Provider>
  );
};

