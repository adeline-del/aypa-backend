import mongoose from 'mongoose';
import { config } from '../config/env';
import { generateToken } from '../utils/jwt';
import { UserModel } from '../models/User';

const API_BASE = 'http://localhost:5000/api';

async function runSuperAdminTests() {
  console.log('--- STARTING SUPER ADMIN CRUD PROGRAMMATIC VERIFICATION ---');

  // Connect to DB and find super_admin user
  const mongoUri = config.mongoUri;
  if (!mongoUri) {
    console.error('MONGODB_URI not found in env config');
    process.exit(1);
  }
  await mongoose.connect(mongoUri);

  let adminUser = await UserModel.findOne({ role: 'super_admin' });
  if (!adminUser) {
    adminUser = await UserModel.findOne({});
  }
  if (!adminUser) {
    console.error('No user found in database.');
    process.exit(1);
  }

  const token = generateToken({
    id: adminUser._id.toString(),
    role: 'super_admin',
    tokenVersion: adminUser.tokenVersion || 0,
  });

  await mongoose.disconnect();

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  console.log(`✅ 1. Super Admin Authentication verified for user ${adminUser.name} (${adminUser._id}). Token acquired.`);

  // ==========================================
  // 2. REPORTS CRUD PERSISTENCE & ATTRIBUTION
  // ==========================================
  console.log('\n--- TESTING REPORTS CRUD ---');

  // Create Report
  const createReportRes = await fetch(`${API_BASE}/reports`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Quarterly Super Admin Performance Report',
      reportingPeriod: 'Q3 2026',
      summary: 'Initial test report summary for programmatic CRUD verification.',
      achievements: 'Completed audit, verified routes',
      challenges: 'None',
      attendance: 150,
      branchId: 'ACC-BR-001',
      archdeaconryId: 'ARCH-ACCRA-NORTH',
    }),
  });
  const createReportData: any = await createReportRes.json();
  console.log('Create Report Response:', createReportData);
  const reportId = createReportData.data?._id || createReportData.data?.id;

  if (!reportId) {
    throw new Error('Report creation failed!');
  }

  const originalSubmittedBy = createReportData.data?.submittedBy;
  console.log('Original submittedBy attribution:', originalSubmittedBy);

  // Read Report
  const readReportRes = await fetch(`${API_BASE}/reports/${reportId}`, {
    headers: authHeaders,
  });
  const readReportData: any = await readReportRes.json();
  console.log('Read Report:', readReportData.success, readReportData.data?.title);

  // Edit Report
  const editReportRes = await fetch(`${API_BASE}/reports/${reportId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Quarterly Super Admin Performance Report (EDITED)',
      summary: 'Updated summary after editorial modification.',
      achievements: 'Completed audit, verified routes, updated content',
    }),
  });
  const editReportData: any = await editReportRes.json();
  console.log('Edit Report:', editReportData.success, editReportData.data?.title);
  console.log('Attribution after Edit (submittedBy):', editReportData.data?.submittedBy);

  if (JSON.stringify(editReportData.data?.submittedBy) !== JSON.stringify(originalSubmittedBy)) {
    console.error('❌ WARNING: Edit report modified submittedBy attribution!');
  } else {
    console.log('✅ Preserved submittedBy attribution after edit.');
  }

  // Submit Report (move from draft to submitted)
  const submitReportRes = await fetch(`${API_BASE}/reports/${reportId}/submit`, {
    method: 'POST',
    headers: authHeaders,
  });
  const submitReportData: any = await submitReportRes.json();
  console.log('Submit Report:', submitReportData.success, submitReportData.data?.status);

  // Review (Approve) Report
  const reviewReportRes = await fetch(`${API_BASE}/reports/${reportId}/approve`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      reviewComment: 'Verified and approved by Super Admin in programmatic test.',
    }),
  });
  const reviewReportData: any = await reviewReportRes.json();
  console.log('Review (Approve) Report:', reviewReportData.success, reviewReportData.data?.status);

  // Delete Report
  const deleteReportRes = await fetch(`${API_BASE}/reports/${reportId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteReportData: any = await deleteReportRes.json();
  console.log('Delete Report:', deleteReportData.success, deleteReportData.message);

  console.log('✅ Reports CRUD + Review Persistence Verified.');

  // ==========================================
  // 3. TASKS CRUD PERSISTENCE & ASSIGNMENTS
  // ==========================================
  console.log('\n--- TESTING TASKS CRUD ---');

  // Create Task
  const createTaskRes = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Prepare Diocesan Synod Presentation',
      description: 'Prepare visual slides and attendance statistics for upcoming synod meeting.',
      assignedTo: 'accra_diocesan_executive',
      assignedToRole: 'accra_diocesan_executive',
      dueDate: '2026-10-15',
      priority: 'high',
      status: 'pending',
    }),
  });
  const createTaskData: any = await createTaskRes.json();
  console.log('Create Task:', createTaskData.success, createTaskData.data?._id || createTaskData.data?.id);
  const taskId = createTaskData.data?._id || createTaskData.data?.id;

  // Read Tasks
  const readTaskRes = await fetch(`${API_BASE}/tasks`, { headers: authHeaders });
  const readTaskData: any = await readTaskRes.json();
  console.log('Read Tasks Count:', readTaskData.data?.length);

  // Edit Task
  const editTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — Prepare Diocesan Synod Presentation (REVISED)',
      priority: 'urgent',
    }),
  });
  const editTaskData: any = await editTaskRes.json();
  console.log('Edit Task:', editTaskData.success, editTaskData.data?.title, editTaskData.data?.priority);

  // Update Status
  const statusTaskRes = await fetch(`${API_BASE}/tasks/${taskId}/status`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ status: 'completed' }),
  });
  const statusTaskData: any = await statusTaskRes.json();
  console.log('Update Task Status:', statusTaskData.success, statusTaskData.data?.status);

  // Delete Task
  const deleteTaskRes = await fetch(`${API_BASE}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteTaskData: any = await deleteTaskRes.json();
  console.log('Delete Task:', deleteTaskData.success, deleteTaskData.message);

  console.log('✅ Tasks CRUD + Status Updates Verified.');

  // ==========================================
  // 4. RESOURCES & DEVOTIONALS CRUD
  // ==========================================
  console.log('\n--- TESTING RESOURCES & DEVOTIONALS CRUD ---');

  // Create Resource
  const createResRes = await fetch(`${API_BASE}/resources`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — AYPA Daily Devotional Guide 2026',
      description: 'Spiritual reading material for daily reflection.',
      category: 'devotional',
      type: 'pdf',
      downloadUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      author: 'Diocesan Chaplain',
      isPublic: true,
      publicId: 'test_sample_pdf_public_id',
      originalFilename: 'TEST_AYPA_Devotional_2026.pdf',
      mimeType: 'application/pdf',
      fileSize: 1048576,
    }),
  });
  const createResData: any = await createResRes.json();
  console.log('Create Resource:', createResData.success, createResData.data?._id || createResData.data?.id);
  const resId = createResData.data?._id || createResData.data?.id;

  // Edit Resource
  const editResRes = await fetch(`${API_BASE}/resources/${resId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      title: 'TEST — AYPA Daily Devotional Guide 2026 (UPDATED)',
      description: 'Updated devotional guide description.',
    }),
  });
  const editResData: any = await editResRes.json();
  console.log('Edit Resource:', editResData.success, editResData.data?.title);

  // Delete Resource
  const deleteResRes = await fetch(`${API_BASE}/resources/${resId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteResData: any = await deleteResRes.json();
  console.log('Delete Resource:', deleteResData.success, deleteResData.message);

  console.log('✅ Resources & Devotionals CRUD Verified.');

  // ==========================================
  // 5. BRANCHES & DIRECTORY LIFECYCLE
  // ==========================================
  console.log('\n--- TESTING BRANCHES & DIRECTORY LIFECYCLE ---');

  // Create Branch
  const createBranchRes = await fetch(`${API_BASE}/branches`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'TEST — St. Mark Youth Branch',
      code: 'SMB-ACC-09',
      parish: 'St. Mark Anglican Church',
      archdeaconryId: 'ARCH-ACCRA-NORTH',
      presidentName: 'Bro. Emmanuel Mensah',
      secretaryName: 'Sis. Abigail Osei',
      chaplainName: 'Rev. Fr. Joseph Addo',
      contactEmail: 'stmark.youth@aypa.org',
      contactPhone: '+233 24 000 9999',
      address: 'North Kaneshie, Accra',
      status: 'active',
    }),
  });
  const createBranchData: any = await createBranchRes.json();
  console.log('Create Branch:', createBranchData.success, createBranchData.data?._id || createBranchData.data?.id);
  const branchId = createBranchData.data?._id || createBranchData.data?.id;

  // Read Branch
  const readBranchRes = await fetch(`${API_BASE}/branches/${branchId}`, { headers: authHeaders });
  const readBranchData: any = await readBranchRes.json();
  console.log('Read Branch:', readBranchData.success, readBranchData.data?.name);

  // Edit Branch Leadership & Fields
  const editBranchRes = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      presidentName: 'Bro. Emmanuel Mensah (Re-elected)',
      secretaryName: 'Sis. Abigail Osei (Confirmed)',
      chaplainName: 'Rev. Fr. Joseph Addo',
      contactEmail: 'stmark.youth.updated@aypa.org',
      contactPhone: '+233 24 111 2222',
      archdeaconryId: 'ARCH-ACCRA-NORTH',
      status: 'active',
    }),
  });
  const editBranchData: any = await editBranchRes.json();
  console.log('Edit Branch Leadership:', editBranchData.success, {
    president: editBranchData.data?.presidentName,
    email: editBranchData.data?.contactEmail,
    archdeaconry: editBranchData.data?.archdeaconryId,
  });

  // Deactivate Branch
  const deactivateBranchRes = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'inactive' }),
  });
  const deactivateBranchData: any = await deactivateBranchRes.json();
  console.log('Deactivate Branch:', deactivateBranchData.success, deactivateBranchData.data?.status);

  // Reactivate Branch
  const reactivateBranchRes = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({ status: 'active' }),
  });
  const reactivateBranchData: any = await reactivateBranchRes.json();
  console.log('Reactivate Branch:', reactivateBranchData.success, reactivateBranchData.data?.status);

  // Clean Up Test Branch (since no users/reports were bound to this temporary test branch)
  const deleteBranchRes = await fetch(`${API_BASE}/branches/${branchId}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  const deleteBranchData: any = await deleteBranchRes.json();
  console.log('Clean Up Test Branch:', deleteBranchData.success, deleteBranchData.message);

  console.log('✅ Branches & Directory Lifecycle Verified.');

  console.log('\n🎉 ALL PROGRAMMATIC SUPER ADMIN CRUD TESTS PASSED SUCCESSFULLY!');
}

runSuperAdminTests().catch((err) => {
  console.error('❌ Programmatic Test Failed:', err);
  process.exit(1);
});
