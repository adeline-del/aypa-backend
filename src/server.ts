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

const app: Application = express();

// Middlewares
app.use(configureCors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    inMemoryMockMode: config.useInMemoryMock,
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
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

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Start Server
const startServer = async () => {
  await connectDB();
  
  app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`🚀 AYPA Backend API Server running on port ${config.port}`);
    console.log(`🌐 API Base URL: http://localhost:${config.port}/api`);
    console.log(`🔒 Allowed CORS Origin: ${config.clientUrl}`);
    console.log(`=======================================================`);
  });
};

startServer();

export default app;
