'use strict';

const { Worker } = require('bullmq');
const { getBullMQConnection } = require('../../config/redis');
const { query } = require('../../config/database');
const { addEmailJob } = require('../queues');
const logger = require('../../utils/logger');

const worker = new Worker(
  'stock-alert-queue',
  async (job) => {
    const { productId, warehouseId, availableQty, threshold, productName } = job.data;

    logger.info(`Stock alert: ${productName} at ${warehouseId} — ${availableQty} remaining (threshold: ${threshold})`);

    // Notify all warehouse managers and admins
    const result = await query(
      `SELECT u.email, u.first_name FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.name IN ('admin', 'warehouse_manager') AND u.status = 'active'`
    );

    for (const user of result.rows) {
      await addEmailJob({
        to: user.email,
        subject: `⚠️ Low Stock Alert — ${productName}`,
        html: `
          <h2>Low Stock Alert</h2>
          <p>Dear ${user.first_name},</p>
          <p>The following product has fallen below the minimum stock threshold:</p>
          <ul>
            <li><strong>Product:</strong> ${productName}</li>
            <li><strong>Available Qty:</strong> ${availableQty}</li>
            <li><strong>Threshold:</strong> ${threshold}</li>
          </ul>
          <p>Please initiate a purchase order.</p>
          <p>— FDMS System</p>
        `,
      });
    }
  },
  { connection: getBullMQConnection(), concurrency: 2 }
);

worker.on('failed', (job, err) => {
  logger.error(`Stock alert job ${job.id} failed`, { err: err.message });
});

module.exports = worker;
