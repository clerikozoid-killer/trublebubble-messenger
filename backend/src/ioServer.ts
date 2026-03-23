import type { Server } from 'socket.io';

let ioSingleton: Server | null = null;

export function registerIoServer(io: Server): void {
  ioSingleton = io;
}

export function getIoServer(): Server | null {
  return ioSingleton;
}
