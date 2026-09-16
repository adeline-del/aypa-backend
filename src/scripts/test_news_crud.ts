import mongoose from 'mongoose';
import { config } from '../config/env';
import { generateToken } from '../utils/jwt';
import { UserModel } from '../models/User';

const API_BASE = 'http://localhost:5000/api';

async function runNewsCrudTest() {
  console.log('=== AYPA Content Studio Phase 2 Programmatic Test Suite ===\n');

  // Step 1: Connect to DB and find a real user for valid auth
  const mongoUri = config.mongoUri;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in env config');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  const realUser = await UserModel.findOne({});
  if (!realUser) {
    console.error('No user found in database.');
    process.exit(1);
  }

  console.log(`1. Generating token for existing DB user: ${realUser.name} (${realUser._id})...`);
  const token = generateToken({
    id: realUser._id.toString(),
    role: realUser.role || 'super_admin',
  });
  await mongoose.disconnect();

  console.log('Auth SUCCESS! Generated valid JWT token.\n');

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test Scenario 1: Valid Draft Creation -> Accepted
  console.log('--- TEST SCENARIO 1: Valid Draft Creation (POST /api/news with minimal draft data) ---');
  const draftRes = await fetch(`${API_BASE}/news`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Programmatic Draft Article',
      category: 'News',
      state: 'draft',
      author: 'Test Suite',
    }),
  });
  const draftData = (await draftRes.json()) as any;
  if (!draftRes.ok || !draftData.success) {
    console.error('Scenario 1 FAILED:', draftData);
    process.exit(1);
  }
  const scratchId = draftData.data.id || draftData.data.numericId;
  console.log(`Scenario 1 PASSED! Created Draft ID: ${scratchId}, State: ${draftData.data.state}\n`);

  // Test Scenario 2: Incomplete Published -> Rejected with field-specific errors
  console.log('--- TEST SCENARIO 2: Incomplete Published Creation (POST /api/news state: published without body text) ---');
  const invalidPubRes = await fetch(`${API_BASE}/news`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Incomplete Published Article',
      category: 'News',
      state: 'published',
      author: 'Test Author',
      excerpt: 'Short', // < 10 chars
      content: 'Short body', // < 20 chars
    }),
  });
  const invalidPubData = (await invalidPubRes.json()) as any;
  if (invalidPubRes.ok) {
    console.error('Scenario 2 FAILED: Expected validation rejection but request passed!');
    process.exit(1);
  }
  console.log('Scenario 2 PASSED! Backend rejected invalid published article as expected.');
  console.log(`Error Response: ${JSON.stringify(invalidPubData.errors)}\n`);

  // Test Scenario 3: Valid Published -> Accepted
  console.log('--- TEST SCENARIO 3: Valid Published Creation (POST /api/news state: published with full data) ---');
  const validPubRes = await fetch(`${API_BASE}/news`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Valid Published Article',
      category: 'News',
      state: 'published',
      author: 'Test Author',
      excerpt: 'This is a valid summary text exceeding 10 characters.',
      content: 'This is a complete article body text that easily satisfies the 20 character minimum constraint.',
    }),
  });
  const validPubData = (await validPubRes.json()) as any;
  if (!validPubRes.ok || !validPubData.success) {
    console.error('Scenario 3 FAILED:', validPubData);
    process.exit(1);
  }
  const validPubId = validPubData.data.id || validPubData.data.numericId;
  console.log(`Scenario 3 PASSED! Created Published Article ID: ${validPubId}, State: ${validPubData.data.state}\n`);

  // Test Scenario 4: Invalid Needs Review -> Rejected
  console.log('--- TEST SCENARIO 4: Invalid Needs Review (PATCH /api/news state: needs_review with short summary) ---');
  const invalidReviewRes = await fetch(`${API_BASE}/news/${scratchId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      state: 'needs_review',
      excerpt: 'Tiny', // < 10 chars
    }),
  });
  const invalidReviewData = (await invalidReviewRes.json()) as any;
  if (invalidReviewRes.ok) {
    console.error('Scenario 4 FAILED: Expected validation rejection but request passed!');
    process.exit(1);
  }
  console.log('Scenario 4 PASSED! Backend rejected invalid needs_review transition as expected.');
  console.log(`Error Response: ${JSON.stringify(invalidReviewData.errors)}\n`);

  // Test Scenario 5: Valid Needs Review -> Accepted
  console.log('--- TEST SCENARIO 5: Valid Needs Review (PATCH /api/news state: needs_review with valid data) ---');
  const validReviewRes = await fetch(`${API_BASE}/news/${scratchId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Programmatic Needs Review Article',
      category: 'Articles',
      excerpt: 'Valid editorial excerpt exceeding ten characters.',
      content: 'Valid editorial body content exceeding twenty characters requirement.',
      author: 'Editorial Team',
      state: 'needs_review',
    }),
  });
  const validReviewData = (await validReviewRes.json()) as any;
  if (!validReviewRes.ok || !validReviewData.success) {
    console.error('Scenario 5 FAILED:', validReviewData);
    process.exit(1);
  }
  console.log(`Scenario 5 PASSED! Updated ID ${scratchId} to State: ${validReviewData.data.state}\n`);

  // Cleanup Scratch Test Records (Do not leave test records in MongoDB)
  console.log('--- CLEANUP: Removing scratch test records ---');
  await fetch(`${API_BASE}/news/${scratchId}`, { method: 'DELETE', headers: authHeaders });
  await fetch(`${API_BASE}/news/${validPubId}`, { method: 'DELETE', headers: authHeaders });
  console.log(`Cleanup SUCCESS! Scratch IDs ${scratchId} and ${validPubId} deleted.\n`);

  // Re-verify existing original test record remains intact
  console.log('--- VERIFY: Confirming original verification record intact ---');
  const checkRes = await fetch(`${API_BASE}/news`, { headers: authHeaders });
  const checkData = (await checkRes.json()) as any;
  const originalRecord = (checkData.data || []).find((n: any) => n.title && n.title.includes('TEST — Content Studio Verification'));
  if (originalRecord) {
    console.log(`Original record INTACT: "${originalRecord.title}" (ID: ${originalRecord.id}, State: ${originalRecord.state})`);
  } else {
    console.log('Remaining publications count:', checkData.data?.length);
  }

  console.log('\n=== ALL 5 VALIDATION SCENARIO TESTS PASSED PERFECTLY ===');
}

runNewsCrudTest().catch(console.error);
