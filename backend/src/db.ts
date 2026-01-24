import { Pool } from 'pg';
import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config();

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'kitchenwiz',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
      }
);

pool.on('error', (err) => {
  logger.fatal({ err }, 'Unexpected error on idle client');
  process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
