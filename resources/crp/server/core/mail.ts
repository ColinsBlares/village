import { createRequire } from 'node:module';
import { getConfig } from './config.js';
import { writeCrash } from './log.js';

const require = createRequire(import.meta.url);

interface MailTransport {
  sendMail(message: Record<string, unknown>, callback: (err: Error | null) => void): void;
}

interface Nodemailer {
  createTransport(options: Record<string, unknown>): MailTransport;
}

export function sendMail(to: string, subject: string, message: string): void {
  const config = getConfig();
  const nodemailer = require('nodemailer') as Nodemailer;
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort !== 587,
    auth: {
      user: config.emailLogin,
      pass: config.emailPass,
    },
    tls: { ciphers: 'SSLv3' },
  });
  transporter.sendMail(
    {
      from: `Classic RolePlay <${config.emailLogin}>`,
      to,
      subject,
      html: `${message}<br /><br />С уважением, команда Classic RolePlay.`,
    },
    (err) => {
      if (err) writeCrash('mail', err);
    },
  );
}
