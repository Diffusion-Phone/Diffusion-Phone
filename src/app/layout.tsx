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
import Providers from "@/contexts/Providers";


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
      <body> 
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
