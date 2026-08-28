import dotenv from 'dotenv';
import path from 'path';

// dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({
   path: path.resolve(process.cwd(), '.env'), 
  });

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}

export const config = {
  port: process.env.PORT || '5000',
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri,
  useInMemoryMock: process.env.USE_IN_MEMORY_MOCK === 'true',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'aypa_accra_jwt_secret_key_default',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};


export default config;