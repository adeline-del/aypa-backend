import cors from 'cors';
import { config } from '../config/env';

export const configureCors = () => {
  const rawOrigins = [
    config.clientUrl,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  // Clean origins (strip trailing slashes, remove empty/invalid strings)
  const allowedOrigins = rawOrigins
    .filter(Boolean)
    .map((origin) => origin.trim().replace(/\/+$/, ''));

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy error: Origin '${origin}' is not permitted.`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });
};
