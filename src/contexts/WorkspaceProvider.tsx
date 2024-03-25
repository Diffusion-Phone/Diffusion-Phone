'use client'
import { AnchorWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react"
import { AnchorProvider, Program, setProvider } from "@coral-xyz/anchor"
import { programId } from "@/lib/constant"
// import IDL from "../../anchor/target/idl/pixelana.json"
import { Pixelana, IDL } from "../../anchor/target/types/pixelana"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"

// Define the structure of the Program context state
type WorkspaceProvider = {
  program: Program<Pixelana> | null,
  provider: AnchorProvider | null
}

// Create the context with default values
const WorkspaceContext = createContext<WorkspaceProvider>({
  program: null,
  provider: null
})

// Custom hook to use the Program context
export const useWorkspace = () => useContext(WorkspaceContext)

// Provider component to wrap around components that need access to the context
export const WorkspaceProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const wallet = useAnchorWallet()
  const { connection } = useConnection()

  // State variable to hold the program instance
  const [program, setProgram] = useState<Program<Pixelana> | null>(null)
  const [provider, setProviderInner] = useState<AnchorProvider | null>(null)

  // Anchor program setup
  const setup = useCallback(async () => {
    /// @ts-ignore
    const provider = new AnchorProvider(connection, wallet as AnchorWallet, {
      commitment: 'confirmed',
    });
    setProvider(provider)
    setProviderInner(provider)
    const program = new Program<Pixelana>(IDL, programId, provider)

    setProgram(program)
  }, [connection, wallet])

  // Effect to fetch program when the component mounts
  useEffect(() => {
    setup()
  }, [setup])

  return (
    <WorkspaceContext.Provider value={{ program, provider }}>
      {children}
    </WorkspaceContext.Provider>
  )
}