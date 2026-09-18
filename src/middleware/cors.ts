import cors from 'cors';
import { config } from '../config/env';

export const configureCors = () => {
  const rawOrigins = [
    // Environment-configured frontend
    config.clientUrl,

    // Official AYPA production domains
    'https://www.aypaadc.org',
    'https://aypaadc.org',

    // Previous Vercel production domain
    'https://aypa-frontend.vercel.app',

    // Local development
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  // Clean origins:
  // - remove empty values
  // - trim whitespace
  // - strip trailing slashes
  // - remove duplicates
  const allowedOrigins = [
    ...new Set(
      rawOrigins
        .filter((origin): origin is string => Boolean(origin))
        .map((origin) => origin.trim().replace(/\/+$/, ''))
    ),
  ];

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header
      // e.g. server-to-server requests, curl, Postman, mobile clients
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked request from origin: ${origin}`);

      return callback(
        new Error(`CORS policy error: Origin '${origin}' is not permitted.`)
      );
    },

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],

    credentials: true,
  });
};