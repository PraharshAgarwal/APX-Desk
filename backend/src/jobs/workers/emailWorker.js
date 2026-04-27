'use strict';

const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { getBullMQConnection } = require('../../config/redis');
const logger = require('../../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const worker = new Worker(
  'email-queue',
  async (job) => {
    const { to, subject, html, text } = job.data;
    logger.info(`Sending email to ${to}: ${subject}`);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FDMS" <noreply@fdms.com>',
      to,
      subject,
      html,
      text,
    });

    logger.info(`Email sent to ${to}`);
  },
  { connection: getBullMQConnection(), concurrency: 5 }
);

worker.on('failed', (job, err) => {
  logger.error(`Email job ${job.id} failed`, { err: err.message });
});

module.exports = worker;
