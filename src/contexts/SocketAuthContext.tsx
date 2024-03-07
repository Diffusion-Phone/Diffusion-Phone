'use client'
import React, { createContext, useContext, useEffect, useState, FC, ReactNode, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SocketAuthContextState {
  socket: Socket | null;
  connectSocket: ({name, avatar, pubKey}: {name: string; avatar:string; pubKey: string}) => void;
  disconnectSocket: () => void;
  socketId: string;
}

const SocketAuthContext = createContext<SocketAuthContextState | undefined>(undefined);

export const useSocketAuth = () => {
  const context = useContext(SocketAuthContext);
  if (context === undefined) {
    throw new Error('useSocketAuth must be used within a SocketAuthProvider');
  }
  return context;
};

export const SocketAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketId, setSocketId] = useState<string>('');
  const wallet = useWallet();

  const connectSocket = useCallback(({name, avatar, pubKey}:{name: string, avatar:string, pubKey: string}) => {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }
    
    const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "localhost:3001", {
      autoConnect: true,
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server', newSocket.id);
      setSocketId(newSocket.id!);
      newSocket.emit('addPlayer', name, avatar, pubKey);
    });

    newSocket.on('connect_error', (error) => {
      toast.error(`Connection error: ${error.message}`);
    });

    setSocket(newSocket);
  }, [wallet.connected, wallet.publicKey]);

  const disconnectSocket = useCallback(() => {
    if (socket) {
      console.log('Disconnecting socket...');
      socket.disconnect();
      setSocket(null);
      setSocketId('');
      router.replace('/')
    }
  }, [socket]);

  useEffect(() => {
    if (!wallet.connected || !wallet.publicKey) {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [wallet.connected, wallet.publicKey, disconnectSocket]);

  return (
    <SocketAuthContext.Provider value={{ socket, connectSocket, disconnectSocket, socketId }}>
      {children}
    </SocketAuthContext.Provider>
  );
};
