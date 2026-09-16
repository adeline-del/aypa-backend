import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import userRoutes from '../routes/userRoutes';
import { config } from '../config/env';
import { UserModel } from '../models/User';

const app = express();
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));
app.use('/api/users', userRoutes);

async function runHttpTests() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aypa_db';
  await mongoose.connect(MONGODB_URI);

  const server = app.listen(5055);
  console.log('Test server listening on port 5055');

  try {
    console.log('\n--- 1. TESTING GET http://localhost:5055/api/health ---');
    const healthRes = await fetch('http://localhost:5055/api/health');
    const healthData = await healthRes.json();
    console.log('HTTP Status:', healthRes.status, healthRes.status === 200 ? '✓ (PASSED)' : '✗');
    console.log('Response:', healthData);

    console.log('\n--- 2. TESTING GET http://localhost:5055/api/users?isApproved=false (UNAUTHENTICATED) ---');
    const unauthRes = await fetch('http://localhost:5055/api/users?isApproved=false');
    console.log('HTTP Status:', unauthRes.status, unauthRes.status === 401 ? '✓ (PASSED: Unauthenticated requests blocked)' : '✗');

    console.log('\n--- 3. TESTING GET http://localhost:5055/api/users?isApproved=false (AUTHENTICATED SUPER ADMIN) ---');
    const superAdminUser = await UserModel.findOne({ role: 'super_admin' });
    if (!superAdminUser) {
      console.warn('Super Admin account not found in DB, skipping token test');
      return;
    }

    const superAdminToken = jwt.sign(
      {
        id: superAdminUser._id.toString(),
        email: superAdminUser.email,
        role: superAdminUser.role,
        tokenVersion: superAdminUser.tokenVersion || 0,
      },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    const authRes = await fetch('http://localhost:5055/api/users?isApproved=false', {
      headers: {
        Authorization: `Bearer ${superAdminToken}`,
      },
    });
    const authData = await authRes.json();
    console.log('HTTP Status:', authRes.status, authRes.status === 200 ? '✓ (PASSED: Authenticated endpoint success)' : '✗');
    console.log('Response Count:', authData.count);
    console.log('Response Data:', JSON.stringify(authData.data, null, 2));

  } finally {
    server.close();
    await mongoose.disconnect();
    console.log('\nTest server closed.');
  }
}

runHttpTests().catch((err) => {
  console.error('HTTP test error:', err);
  process.exit(1);
});
