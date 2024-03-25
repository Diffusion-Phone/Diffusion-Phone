import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { Web3ContextProvider } from "@/contexts/ContextProvider";
import { SocketAuthProvider } from "@/contexts/SocketAuthContext";
import { Toaster } from "sonner";
import { GameStateProvider } from "@/contexts/GameStateProvider";
import { WorkspaceProvider } from "@/contexts/WorkspaceProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Head from "next/head";


// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixeLana",
  description: "prompt creativity, mint memories",
};

const client = new QueryClient()

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-pink-500 to-purple-500">
        <Image
          src={"/textura-background.png"}
          className="z-0"
          alt="bg-img"
          layout="fill"
          objectFit="cover" // This makes the image cover the available space
          quality={100}
        />
        <Web3ContextProvider>
          {/* TODO: should remove socketauth provider */}
          <SocketAuthProvider>
            <WorkspaceProvider>
              <QueryClientProvider client={client}>
                <GameStateProvider>{children}</GameStateProvider>
              </QueryClientProvider>
            </WorkspaceProvider>
          </SocketAuthProvider>
        </Web3ContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
