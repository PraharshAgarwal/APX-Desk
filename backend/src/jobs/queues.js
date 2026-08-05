'use strict';

const { Queue } = require('bullmq');
const { getBullMQConnection } = require('../config/redis');
const logger = require('../utils/logger');

// ── Queue Definitions ──────────────────────────────────────────
// Each Queue needs its OWN connection (maxRetriesPerRequest: null)

const emailQueue      = new Queue('email-queue',       { connection: getBullMQConnection() });
const smsQueue        = new Queue('sms-queue',         { connection: getBullMQConnection() });
const stockAlertQueue = new Queue('stock-alert-queue', { connection: getBullMQConnection() });
const notifQueue      = new Queue('notification-queue', { connection: getBullMQConnection() });

// ── Add Jobs (helper functions) ───────────────────────────────

async function addEmailJob(data, opts = {}) {
  return emailQueue.add('send-email', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, ...opts });
}

async function addSMSJob(data, opts = {}) {
  return smsQueue.add('send-sms', data, { attempts: 3, backoff: { type: 'exponential', delay: 2000 }, ...opts });
}

async function addStockAlertJob(data, opts = {}) {
  return stockAlertQueue.add('stock-alert', data, { attempts: 2, ...opts });
}

async function addNotificationJob(data, opts = {}) {
  return notifQueue.add('push-notification', data, { attempts: 2, ...opts });
}

// ── Start Workers ─────────────────────────────────────────────

function startWorkers(io) {
  require('./workers/emailWorker');
  require('./workers/smsWorker');
  require('./workers/stockAlertWorker');

  // Start the schedulers
  const expiryScanner = require('./schedulers/expiryScanner');
  expiryScanner.start(stockAlertQueue);

  const reservationReaper = require('./schedulers/reservationReaper');
  reservationReaper.start();

  logger.info('BullMQ workers started');
}

module.exports = {
  emailQueue, smsQueue, stockAlertQueue, notifQueue,
  addEmailJob, addSMSJob, addStockAlertJob, addNotificationJob,
  startWorkers,
};
