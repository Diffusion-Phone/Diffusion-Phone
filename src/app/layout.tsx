import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { Web3ContextProvider } from "@/contexts/ContextProvider";
import Head from "next/head";
import { SocketAuthProvider } from "@/contexts/SocketAuthContext";
import { Toaster } from "sonner";
import { GameStateProvider } from "@/contexts/GameStateProvider";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PixeLana",
  description: "prompt creativity, mint memories",
};

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
          <SocketAuthProvider>
            <GameStateProvider>{children}</GameStateProvider>
          </SocketAuthProvider>
        </Web3ContextProvider>
        <Toaster />
      </body>
    </html>
  );
}
