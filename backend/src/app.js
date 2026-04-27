'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

// Module Routers
const authRoutes = require('./modules/auth/auth.routes');
const usersRoutes = require('./modules/users/users.routes');
const productsRoutes = require('./modules/products/products.routes');
const inventoryRoutes = require('./modules/inventory/inventory.routes');
const ordersRoutes = require('./modules/orders/orders.routes');
const warehouseRoutes = require('./modules/warehouse/warehouse.routes');
const financeRoutes = require('./modules/finance/finance.routes');
const notificationsRoutes = require('./modules/notifications/notifications.routes');
const businessesRoutes = require('./modules/businesses/businesses.routes');

const app = express();

// ── Security Middleware ──────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────
// In development: reflect any origin (origin: true) so any localhost port works.
// In production: restrict to CORS_ORIGIN env var.
const corsOrigin = process.env.NODE_ENV === 'production'
  ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : false)
  : true; // true = reflect request Origin header — works with credentials

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global Rate Limiter ──────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } },
});
app.use(limiter);

// ── Body & Compression ───────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Logging ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ───────────────────────────────────────────────
const API = '/api';

// Public routes
app.use(`${API}/auth`, authRoutes);

// Protected routes — all require valid JWT
app.use(`${API}/users`, authenticate, usersRoutes);
app.use(`${API}/products`, authenticate, productsRoutes);
app.use(`${API}/inventory`, authenticate, inventoryRoutes);
app.use(`${API}/orders`, authenticate, ordersRoutes);
app.use(`${API}/warehouse`, authenticate, warehouseRoutes);
app.use(`${API}/finance`, authenticate, financeRoutes);
app.use(`${API}/notifications`, authenticate, notificationsRoutes);
app.use(`${API}/businesses`, authenticate, businessesRoutes);

// ── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
