import mongoose from 'mongoose';
import { config } from '../config/env';
import { generateToken } from '../utils/jwt';
import { UserModel } from '../models/User';

const API_BASE = 'http://localhost:5000/api';

async function runSecurityEndpointTests() {
  console.log('--- STARTING PROGRAMMATIC SECURITY ENDPOINT VERIFICATION ---');

  // Step 1: Unauthenticated request test
  console.log('\n1. Testing Unauthenticated Request to /api/security/revoke-sessions...');
  const unauthRes = await fetch(`${API_BASE}/security/revoke-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  console.log('Unauthenticated HTTP Status:', unauthRes.status);
  const unauthData: any = await unauthRes.json();
  console.log('Unauthenticated Response:', unauthData.message);

  if (unauthRes.status !== 401) {
    throw new Error(`Expected HTTP 401 for unauthenticated request, got ${unauthRes.status}`);
  }
  console.log('✅ Unauthenticated request correctly rejected with 401.');

  // Step 2: Non-Super Admin Role Authorization test (Youth/Branch Exec)
  const mongoUri = config.mongoUri;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in env config');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  let youthUser = await UserModel.findOne({ role: 'youth' });
  if (!youthUser) {
    youthUser = await UserModel.findOne({ role: { $ne: 'super_admin' } });
  }

  if (youthUser) {
    console.log(`\n2. Testing Non-Super Admin Request with role (${youthUser.role})...`);
    const youthToken = generateToken({
      id: youthUser._id.toString(),
      role: youthUser.role,
      tokenVersion: youthUser.tokenVersion || 0,
    });

    const nonAdminRes = await fetch(`${API_BASE}/security/revoke-sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${youthToken}`,
      },
    });
    console.log('Non-Super Admin HTTP Status:', nonAdminRes.status);
    const nonAdminData: any = await nonAdminRes.json();
    console.log('Non-Super Admin Response:', nonAdminData.message);

    if (nonAdminRes.status !== 403) {
      throw new Error(`Expected HTTP 403 for non-Super Admin request, got ${nonAdminRes.status}`);
    }
    console.log('✅ Non-Super Admin request correctly rejected with 403 Forbidden.');
  }

  await mongoose.disconnect();

  console.log('\n3. Safe non-destructive verification complete. Global session revocation execution was deliberately omitted to preserve live DB sessions.');
  console.log('🎉 PROGRAMMATIC SECURITY ROUTE VERIFICATION PASSED!');
}

runSecurityEndpointTests().catch((err) => {
  console.error('❌ Security Endpoint Test Failed:', err);
  process.exit(1);
});
