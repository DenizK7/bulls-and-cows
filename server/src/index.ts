import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { connectRedis } from './config/redis.js';
import authRoutes from './routes/auth.routes.js';
import { setupSocket } from './socket/index.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: env.corsOrigin, credentials: true },
  transports: ['websocket'],
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e4,
});

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST routes
app.use('/api/v1/auth', authRoutes);

// Socket.io
setupSocket(io);

async function start() {
  await connectDatabase();
  await connectRedis();

  httpServer.listen(env.port, () => {
    console.log(`Server running on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export { io };
