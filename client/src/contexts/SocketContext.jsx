import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true
    });

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      // Only log if it's not a normal client-side disconnect
      if (reason !== 'io client disconnect') {
        console.log('❌ Socket disconnected:', reason);
      }
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      // Safe cleanup - only disconnect if connected
      if (socketInstance.connected) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const joinRoom = (data) => {
    if (socket && connected) {
      socket.emit('join-room', data);
      console.log('Joined rooms:', data);
    }
  };

  const leaveRoom = (roomName) => {
    if (socket && connected) {
      socket.emit('leave-room', roomName);
      console.log('Left room:', roomName);
    }
  };

  const value = {
    socket,
    connected,
    joinRoom,
    leaveRoom
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
