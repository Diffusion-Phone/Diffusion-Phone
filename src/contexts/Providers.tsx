// In Next.js, this file would be called: app/providers.jsx
'use client'

// We can not useState or useRef in a server component, which is why we are
// extracting this part out into it's own file with 'use client' on top
import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GameStateProvider } from "@/contexts/GameStateProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceProvider";
import { Web3ContextProvider } from "@/contexts/ContextProvider";
import { SocketAuthProvider } from "@/contexts/SocketAuthContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = getQueryClient()

  return (
    <Web3ContextProvider>
      {/* TODO: should remove socketauth provider */}
      <SocketAuthProvider>
        {/* <WorkspaceProvider> */}
          <QueryClientProvider client={queryClient}>
            <GameStateProvider>{children}</GameStateProvider>
          </QueryClientProvider>
        {/* </WorkspaceProvider> */}
      </SocketAuthProvider>
    </Web3ContextProvider>
  )
}