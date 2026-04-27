'use strict';

require('dotenv').config();
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const app = require('./app');
const { validateEnv } = require('./config/env');
const { getRedisClient } = require('./config/redis');
const logger = require('./utils/logger');
const { startWorkers } = require('./jobs/queues');
const { runMigrations } = require('./config/migrations');

// Validate environment variables on startup
validateEnv();

const PORT = process.env.PORT || 4000;
const httpServer = http.createServer(app);

// Socket.IO — real-time notifications
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Attach io to app so services can emit events
app.set('io', io);

// Socket.IO — room-per-user pattern
io.on('connection', (socket) => {
  logger.info(`WS client connected: ${socket.id}`);

  socket.on('join', (userId) => {
    socket.join(`user:${userId}`);
    logger.debug(`Socket ${socket.id} joined room user:${userId}`);
  });

  socket.on('disconnect', () => {
    logger.debug(`WS client disconnected: ${socket.id}`);
  });
});

// Start BullMQ workers
startWorkers(io);

// Graceful shutdown
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    const redis = getRedisClient();
    await redis.quit();
    logger.info('Server and Redis closed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // force exit after 10s
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { err });
  process.exit(1);
});

// Run auto-migrations then start listening
runMigrations()
  .then(() => {
    httpServer.listen(PORT, () => {
      logger.info(`🌱 FDMS API running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    logger.error('Migration failed — server not started', { err });
    process.exit(1);
  });

module.exports = { httpServer, io };
