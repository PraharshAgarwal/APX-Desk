'use strict';

const { Worker } = require('bullmq');
const { getBullMQConnection } = require('../../config/redis');
const logger = require('../../utils/logger');

// Twilio (or any SMS provider)
let twilioClient;
function getTwilio() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID) {
    const twilio = require('twilio');
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

const worker = new Worker(
  'sms-queue',
  async (job) => {
    const { to, message } = job.data;
    const client = getTwilio();

    if (!client) {
      logger.warn('Twilio not configured, skipping SMS', { to, message });
      return;
    }

    await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to,
    });

    logger.info(`SMS sent to ${to}`);
  },
  { connection: getBullMQConnection(), concurrency: 3 }
);

worker.on('failed', (job, err) => {
  logger.error(`SMS job ${job.id} failed`, { err: err.message });
});

module.exports = worker;
