import type { Metadata } from "next";
import Image from "next/image";
import "./globals.css";
import { Web3ContextProvider } from "@/contexts/ContextProvider";
import { SocketAuthProvider } from "@/contexts/SocketAuthContext";
import { Toaster } from "sonner";

// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-b from-pink-500 to-purple-500">
        <Image src={"/textura-background.png"} className="z-0" alt="bg-img" layout="fill"
        objectFit="cover" // This makes the image cover the available space
        quality={100}
        />
        <Web3ContextProvider>
          <SocketAuthProvider>
          {children}
          <Toaster />
          </SocketAuthProvider>
        </Web3ContextProvider>
      </body>
    </html>
  );
}
