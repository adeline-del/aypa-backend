import mongoose from 'mongoose';
import { config } from './env';

export const connectDB = async (): Promise<void> => {
  if (config.useInMemoryMock) {
    console.log(
      '[Database] Operating in Database Mock Fallback mode (In-Memory Data Store active).'
    );
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri);

    console.log(
      `[Database] MongoDB Connected Successfully: ${conn.connection.host}`
    );
  } catch (error) {
    console.error(
      `[Database] Connection Error: ${(error as Error).message}`
    );

    throw error;
  }
};