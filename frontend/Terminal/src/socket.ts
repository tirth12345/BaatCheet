import { io } from 'socket.io-client';

const SOCKET_SERVER = 'http://localhost:5001';

// Create socket instance outside component to prevent duplicate connections
// This ensures single instance across React re-renders
export const socket = io(SOCKET_SERVER, {
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});
