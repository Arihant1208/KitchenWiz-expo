import pino from 'pino';

function envLevel(): string {
  const level = (process.env.LOG_LEVEL || '').toString().trim().toLowerCase();
  return level || 'info';
}

export const logger = pino({
  level: envLevel(),
  base: undefined, // avoid pid/hostname noise; include via transport if needed
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'headers.authorization',
      'headers.cookie',
    ],
    remove: true,
  },
});
