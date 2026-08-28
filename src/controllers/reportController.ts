import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { ReportModel, IReport, ReportStatus } from '../models/Report';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { inMemoryReports } from '../utils/mockStore';
import { checkOrgScope } from '../middleware/authorize';

export const getReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { status, reportingPeriod, branchId, archdeaconryId } = req.query;

  // Build organizational scope query filter server-side
  let queryBranchId = branchId as string | undefined;
  let queryArchId = archdeaconryId as string | undefined;

  if (req.user.role === 'branch_executive') {
    if (!req.user.branchId) {
      throw new ApiError(400, 'User does not have an assigned branchId.');
    }
    queryBranchId = req.user.branchId; // Force branch exec to see only their branch
  } else if (req.user.role === 'archdeaconry_executive') {
    if (!req.user.archdeaconryId) {
      throw new ApiError(400, 'User does not have an assigned archdeaconryId.');
    }
    queryArchId = req.user.archdeaconryId; // Force archdeaconry exec to see only their archdeaconry
  } else if (req.user.role === 'youth') {
    throw new ApiError(403, 'Access denied. Youth members cannot view organizational branch reports.');
  }

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryReports];

    if (queryBranchId) {
      filtered = filtered.filter((r) => r.branchId === queryBranchId);
    }
    if (queryArchId) {
      filtered = filtered.filter((r) => r.archdeaconryId === queryArchId);
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (reportingPeriod) {
      filtered = filtered.filter((r) => r.reportingPeriod === reportingPeriod);
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
    return;
  }

  const query: Record<string, any> = {};
  if (queryBranchId) query.branchId = queryBranchId;
  if (queryArchId) query.archdeaconryId = queryArchId;
  if (status) query.status = status;
  if (reportingPeriod) query.reportingPeriod = reportingPeriod;

  const reports = await ReportModel.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: reports.length,
    data: reports.map((r) => r.toJSON()),
  });
};

export const getReportById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!checkOrgScope(req.user, { branchId: report.branchId, archdeaconryId: report.archdeaconryId })) {
      throw new ApiError(403, 'Access denied. Report belongs to a different branch or archdeaconry.');
    }

    res.status(200).json({
      success: true,
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!checkOrgScope(req.user, { branchId: report.branchId, archdeaconryId: report.archdeaconryId })) {
    throw new ApiError(403, 'Access denied. Report belongs to a different branch or archdeaconry.');
  }

  res.status(200).json({
    success: true,
    data: report.toJSON(),
  });
};

export const createReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');

  if (req.user.role === 'branch_executive' && (!req.user.branchId || !req.user.archdeaconryId)) {
    throw new ApiError(400, 'Branch Executive must have assigned branchId and archdeaconryId to create reports.');
  }

  const { title, reportingPeriod, summary, activities, attendance, achievements, challenges, recommendations } = req.body;

  const branchId = req.user.branchId || req.body.branchId || 'default-branch';
  const archdeaconryId = req.user.archdeaconryId || req.body.archdeaconryId || 'default-archdeaconry';
  const dioceseId = req.user.dioceseId || 'accra';

  if (config.useInMemoryMock) {
    const newReport: IReport = {
      id: Date.now().toString(),
      title,
      reportingPeriod,
      branchId,
      archdeaconryId,
      dioceseId,
      submittedBy: req.user.id,
      status: 'draft',
      summary,
      activities: activities || '',
      attendance: attendance || 0,
      achievements: achievements || '',
      challenges: challenges || '',
      recommendations: recommendations || '',
    };

    inMemoryReports.push(newReport);

    res.status(201).json({
      success: true,
      message: 'Branch report draft created successfully.',
      data: newReport,
    });
    return;
  }

  const newReport = await ReportModel.create({
    title,
    reportingPeriod,
    branchId,
    archdeaconryId,
    dioceseId,
    submittedBy: req.user.id,
    status: 'draft',
    summary,
    activities,
    attendance,
    achievements,
    challenges,
    recommendations,
  });

  res.status(201).json({
    success: true,
    message: 'Branch report draft created successfully.',
    data: newReport.toJSON(),
  });
};

export const updateReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;
  const updates = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) throw new ApiError(404, 'Report not found.');

    if (!checkOrgScope(req.user, { branchId: report.branchId, archdeaconryId: report.archdeaconryId })) {
      throw new ApiError(403, 'Access denied. You cannot modify reports outside your branch scope.');
    }

    if (report.status !== 'draft' && report.status !== 'rejected') {
      throw new ApiError(400, `Cannot modify report with status '${report.status}'. Only 'draft' or 'rejected' reports can be updated.`);
    }

    Object.assign(report, updates);
    res.status(200).json({
      success: true,
      message: 'Report updated successfully.',
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.');

  if (!checkOrgScope(req.user, { branchId: report.branchId, archdeaconryId: report.archdeaconryId })) {
    throw new ApiError(403, 'Access denied. You cannot modify reports outside your branch scope.');
  }

  if (report.status !== 'draft' && report.status !== 'rejected') {
    throw new ApiError(400, `Cannot modify report with status '${report.status}'. Only 'draft' or 'rejected' reports can be updated.`);
  }

  Object.assign(report, updates);
  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report updated successfully.',
    data: report.toJSON(),
  });
};

export const submitReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) throw new ApiError(404, 'Report not found.');

    if (!checkOrgScope(req.user, { branchId: report.branchId })) {
      throw new ApiError(403, 'Access denied. Only the branch executive of this branch can submit this report.');
    }

    if (report.status !== 'draft' && report.status !== 'rejected') {
      throw new ApiError(400, `Report cannot be submitted from current status '${report.status}'. Legal status transitions: draft -> submitted or rejected -> submitted.`);
    }

    report.status = 'submitted';
    res.status(200).json({
      success: true,
      message: 'Branch report submitted successfully for review.',
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.');

  if (!checkOrgScope(req.user, { branchId: report.branchId })) {
    throw new ApiError(403, 'Access denied. Only the branch executive of this branch can submit this report.');
  }

  if (report.status !== 'draft' && report.status !== 'rejected') {
    throw new ApiError(400, `Report cannot be submitted from current status '${report.status}'.`);
  }

  report.status = 'submitted';
  await report.save();

  res.status(200).json({
    success: true,
    message: 'Branch report submitted successfully for review.',
    data: report.toJSON(),
  });
};

export const reviewReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;
  const { reviewComment } = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) throw new ApiError(404, 'Report not found.');

    if (report.status !== 'submitted') {
      throw new ApiError(400, `Report cannot be moved to 'under_review' from status '${report.status}'.`);
    }

    report.status = 'under_review';
    report.reviewedBy = req.user.id;
    if (reviewComment) report.reviewComment = reviewComment;

    res.status(200).json({
      success: true,
      message: 'Report is now under review.',
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.');

  if (report.status !== 'submitted') {
    throw new ApiError(400, `Report cannot be moved to 'under_review' from status '${report.status}'.`);
  }

  report.status = 'under_review';
  report.reviewedBy = req.user.id;
  if (reviewComment) report.reviewComment = reviewComment;
  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report is now under review.',
    data: report.toJSON(),
  });
};

export const approveReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;
  const { reviewComment } = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) throw new ApiError(404, 'Report not found.');

    if (report.status !== 'under_review' && report.status !== 'submitted') {
      throw new ApiError(400, `Cannot approve report from status '${report.status}'. Reports must be submitted or under review.`);
    }

    report.status = 'approved';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    if (reviewComment) report.reviewComment = reviewComment;

    res.status(200).json({
      success: true,
      message: 'Report approved successfully.',
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.');

  if (report.status !== 'under_review' && report.status !== 'submitted') {
    throw new ApiError(400, `Cannot approve report from status '${report.status}'.`);
  }

  report.status = 'approved';
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  if (reviewComment) report.reviewComment = reviewComment;
  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report approved successfully.',
    data: report.toJSON(),
  });
};

export const rejectReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) throw new ApiError(401, 'Authentication required.');
  const { id } = req.params;
  const { reviewComment } = req.body;

  if (!reviewComment) {
    throw new ApiError(400, 'A review comment explaining the rejection is required.');
  }

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find((r) => r.id === id);
    if (!report) throw new ApiError(404, 'Report not found.');

    if (report.status !== 'under_review' && report.status !== 'submitted') {
      throw new ApiError(400, `Cannot reject report from status '${report.status}'.`);
    }

    report.status = 'rejected';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    report.reviewComment = reviewComment;

    res.status(200).json({
      success: true,
      message: 'Report rejected and returned to branch executive for revision.',
      data: report,
    });
    return;
  }

  const report = await ReportModel.findById(id);
  if (!report) throw new ApiError(404, 'Report not found.');

  if (report.status !== 'under_review' && report.status !== 'submitted') {
    throw new ApiError(400, `Cannot reject report from status '${report.status}'.`);
  }

  report.status = 'rejected';
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  report.reviewComment = reviewComment;
  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report rejected and returned to branch executive for revision.',
    data: report.toJSON(),
  });
};
