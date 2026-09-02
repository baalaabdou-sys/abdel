import { config } from 'dotenv';

config({ path: '.env.test' });
config({ path: '.env' });

process.env.AUTH_SECRET ??= 'test-secret-at-least-24-characters-long';
process.env.ENCRYPTION_KEY ??= 'test-encryption-key-32-bytes-minimum';
process.env.APP_URL ??= 'http://localhost:3000';
process.env.EMAIL_PROVIDER ??= 'demo';
process.env.AI_PROVIDER ??= 'demo';
process.env.VERIFICATION_PROVIDER ??= 'demo';
