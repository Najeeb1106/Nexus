import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext<Socket | null>(null);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (user && token) {
      let socketUrl = import.meta.env.VITE_SOCKET_URL;
      if (!socketUrl && import.meta.env.VITE_API_URL) {
        socketUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
      }
      if (!socketUrl) {
        socketUrl = 'http://localhost:5000';
      }

      const newSocket = io(socketUrl, {
        auth: { token }
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  return useContext(SocketContext);
};
