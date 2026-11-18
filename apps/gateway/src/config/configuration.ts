import * as path from 'path';

export default () => ({
  port: parseInt(process.env.PORT || '18091', 10),
  environment: process.env.NODE_ENV || 'development',
  database: {
    type: 'sqlite',
    database: process.env.DATABASE_PATH || path.resolve(__dirname, '../../data/wagyuu.sqlite'),
    synchronize: process.env.NODE_ENV !== 'production',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  security: {
    hmacSecret: process.env.WAGYUU_HMAC_SECRET || 'wagyuu-default-hmac-secret-change-in-prod-12345678',
    encryptionKey: process.env.WAGYUU_ENCRYPTION_KEY || 'wagyuu-32-char-encryption-key-12345',
  },
  storage: {
    sessionsPath: process.env.WAGYUU_SESSIONS_PATH || path.resolve(__dirname, '../../data/sessions'),
  },
});
