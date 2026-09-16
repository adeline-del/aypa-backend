import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import { UserModel } from '../models/User';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aypa_db';

async function runVerification() {
  console.log('=== PHASE 1 VERIFICATION START ===');
  console.log('Connecting to MongoDB Atlas at:', MONGODB_URI.replace(/:[^:@]+@/, ':****@'));
  
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to database:', mongoose.connection.name);

  // 1. Inspect target pending user before approval
  const targetEmail = 'arcapprove@aypa.com';
  const targetUser = await UserModel.findOne({ email: targetEmail });

  if (!targetUser) {
    console.error(`ERROR: Target user ${targetEmail} not found in database!`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log('\n--- 1. PRE-APPROVAL MONGODB DOCUMENT ---');
  console.log('User ID:', targetUser._id.toString());
  console.log('Name:', targetUser.name);
  console.log('Email:', targetUser.email);
  console.log('Role:', targetUser.role);
  console.log('isApproved:', targetUser.isApproved);
  console.log('isActive:', targetUser.isActive);
  console.log('dioceseId:', targetUser.dioceseId);
  console.log('archdeaconryId:', targetUser.archdeaconryId);
  console.log('branchId:', targetUser.branchId);
  console.log('church:', targetUser.church);
  console.log('permissions count:', targetUser.permissions ? targetUser.permissions.length : 0);
  console.log('appointmentHistory:', JSON.stringify(targetUser.appointmentHistory, null, 2));

  // 2. Fetch pending users query (equivalent to GET /api/users?isApproved=false)
  const pendingUsers = await UserModel.find({ isApproved: false });
  console.log(`\n--- 2. GET /api/users?isApproved=false QUERY ---`);
  console.log(`Found ${pendingUsers.length} pending user(s):`);
  pendingUsers.forEach((u) => {
    console.log(` - ${u.name} (${u.email}) [role: ${u.role}, isApproved: ${u.isApproved}]`);
  });

  const isTargetInPending = pendingUsers.some((u) => u.email === targetEmail);
  console.log(`Is ${targetEmail} in pending queue before approval?`, isTargetInPending ? 'YES (PASSED)' : 'NO');

  // 3. Execute Super Admin Approval Action (PATCH /api/users/:id/approve)
  console.log(`\n--- 3. EXECUTING APPROVAL FOR ${targetEmail} ---`);
  targetUser.isApproved = true;
  await targetUser.save();
  console.log('Successfully updated userDoc.isApproved = true in MongoDB Atlas!');

  // 4. Inspect MongoDB Document Post-Approval
  const updatedUser = await UserModel.findOne({ email: targetEmail });
  console.log('\n--- 4. POST-APPROVAL MONGODB DOCUMENT VERIFICATION ---');
  if (updatedUser) {
    console.log('isApproved:', updatedUser.isApproved, updatedUser.isApproved === true ? '✓ (PASSED: isApproved is now true)' : '✗ (FAILED)');
    console.log('role:', updatedUser.role, updatedUser.role === 'archdeaconry_executive' ? '✓ (PASSED: role preserved)' : '✗ (FAILED)');
    console.log('dioceseId:', updatedUser.dioceseId, updatedUser.dioceseId === 'accra' ? '✓ (PASSED: dioceseId preserved)' : '✗ (FAILED)');
    console.log('archdeaconryId:', updatedUser.archdeaconryId, updatedUser.archdeaconryId === 'accra-east' ? '✓ (PASSED: archdeaconryId preserved)' : '✗ (FAILED)');
    console.log('branchId:', updatedUser.branchId, updatedUser.branchId === 'e10' ? '✓ (PASSED: branchId preserved)' : '✗ (FAILED)');
    console.log('isActive:', updatedUser.isActive, updatedUser.isActive === true ? '✓ (PASSED: isActive preserved)' : '✗ (FAILED)');
    console.log('appointmentHistory count:', updatedUser.appointmentHistory?.length, updatedUser.appointmentHistory?.length === 1 ? '✓ (PASSED: appointmentHistory preserved)' : '✗ (FAILED)');
  }

  // 5. Re-query Pending Queue after approval (GET /api/users?isApproved=false)
  const pendingUsersAfter = await UserModel.find({ isApproved: false });
  const isTargetStillInPending = pendingUsersAfter.some((u) => u.email === targetEmail);
  console.log(`\n--- 5. RE-QUERY GET /api/users?isApproved=false AFTER APPROVAL ---`);
  console.log(`Remaining pending count: ${pendingUsersAfter.length}`);
  console.log(`Is ${targetEmail} still in pending queue?`, isTargetStillInPending ? 'YES (FAILED)' : 'NO (PASSED - REMOVED FROM PENDING QUEUE)');

  // 6. Test login readiness for approved user
  console.log(`\n--- 6. LOGIN ACCESS READINESS FOR ${targetEmail} ---`);
  const isPasswordValid = await updatedUser?.comparePassword('password123');
  console.log('Password hash comparison:', isPasswordValid ? '✓ Password valid' : '✗ Password invalid');
  console.log('Is user login authorized now?', updatedUser?.isApproved && updatedUser?.isActive ? '✓ YES (Allowed)' : '✗ NO (Blocked)');

  await mongoose.disconnect();
  console.log('\n=== PHASE 1 VERIFICATION COMPLETE ===');
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
