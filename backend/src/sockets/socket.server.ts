import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../shared/utils/token';

let io: Server | undefined;

export const userRoom = (userId: string) => `user:${userId}`;

export function initSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: env.CLIENT_URL, credentials: true } });

  // Runs once per connection, before it is accepted: the browser sends its access token
  // in `auth`, and we reject anyone without a valid one.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string') throw new Error('Missing token');
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // A private room per user: emitting to it reaches every tab/device of that user only.
    void socket.join(userRoom(socket.data.userId as string));
    logger.debug({ userId: socket.data.userId }, 'Socket connected');
  });

  return io;
}

// Safe to call when no socket server exists (e.g. in unit tests): it just does nothing.
export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(userRoom(userId)).emit(event, payload);
}

export async function closeSocketServer() {
  const current = io;
  io = undefined;
  if (current) await current.close();
}
