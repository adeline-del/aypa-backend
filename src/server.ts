import express, { Application, Request, Response } from 'express';
import { config } from './config/env';
import { connectDB } from './config/db';
import { configureCors } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import branchRoutes from './routes/branchRoutes';
import reportRoutes from './routes/reportRoutes';
import taskRoutes from './routes/taskRoutes';
import eventRoutes from './routes/eventRoutes';
import programRoutes from './routes/programRoutes';
import resourceRoutes from './routes/resourceRoutes';
import newsRoutes from './routes/newsRoutes';
import supportRoutes from './routes/supportRoutes';
import contactRoutes from './routes/contactRoutes';
import archdeaconryRoutes from './routes/archdeaconryRoutes';
import eventRegistrationRoutes from './routes/eventRegistrationRoutes';
import mediaRoutes from './routes/mediaRoutes';
import notificationRoutes from './routes/notificationRoutes';
import securityRoutes from './routes/securityRoutes';

const app: Application = express();

// Middlewares
app.use(configureCors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  const isCloudinaryConfigured = Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
  const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    inMemoryMockMode: config.useInMemoryMock,
    environment: config.nodeEnv,
    database: config.useInMemoryMock ? 'In-Memory Mock Store' : 'Connected (MongoDB Engine)',
    services: {
      cloudinary: isCloudinaryConfigured ? 'Configured' : 'Not Configured',
      email: isEmailConfigured ? 'Configured' : 'Not Configured',
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/archdeaconries', archdeaconryRoutes);
app.use('/api/events', eventRegistrationRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Process Diagnostics & Safe Exception Handlers
process.on('uncaughtException', (err: Error) => {
  console.error('[Process Error] Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[Process Error] Unhandled Promise Rejection:', reason);
});

process.on('exit', (code: number) => {
  if (code !== 0) {
    console.error(`[Process Warning] AYPA Backend API process exited with code ${code}`);
  }
});

// Start Server
const startServer = async () => {
  try {
    await connectDB();
    
    const serverPort = config.port;
    app.listen(serverPort, () => {
      console.log(`=======================================================`);
      console.log(`🚀 AYPA Backend API Server running on port ${serverPort}`);
      console.log(`🌐 API Base URL: http://localhost:${serverPort}/api`);
      console.log(`🏥 Health Check: http://localhost:${serverPort}/api/health`);
      console.log(`🔒 Allowed CORS Origin: ${config.clientUrl}`);
      console.log(`=======================================================`);
    });
  } catch (error) {
    console.error('[Server Startup Failure]', (error as Error).message);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

export default app;
