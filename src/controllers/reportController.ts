import { Response } from 'express';

import { AuthenticatedRequest } from '../middleware/auth';

import {
  ReportModel,
  IReport,
} from '../models/Report';

import { ApiError } from '../utils/ApiError';

import { config } from '../config/env';

import { inMemoryReports } from '../utils/mockStore';

import { checkOrgScope } from '../middleware/authorize';
import { createNotificationHelper } from './notificationController';

const canAccessReport = (
  req: AuthenticatedRequest,
  report: { branchId?: string; archdeaconryId?: string; dioceseId?: string },
): boolean => {
  if (!req.user) {
    return false;
  }

  return checkOrgScope(req.user, {
    branchId: report.branchId,
    archdeaconryId: report.archdeaconryId,
    dioceseId: report.dioceseId,
  });
};

const canModifyReport = (
  req: AuthenticatedRequest,
  report: { branchId?: string; archdeaconryId?: string; dioceseId?: string },
): boolean => {
  if (!req.user) {
    return false;
  }

  if (!canAccessReport(req, report)) {
    return false;
  }

  /**
   * Branch executives own the branch-report submission workflow.
   *
   * Administrative/global roles may manage reports through
   * their broader permissions.
   */
  if (
    req.user.role === 'admin' ||
    req.user.role === 'super_admin'
  ) {
    return true;
  }

  return (
    req.user.role === 'branch_executive' &&
    report.branchId === req.user.branchId
  );
};

export const getReports = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    status,
    reportingPeriod,
    branchId,
    archdeaconryId,
  } = req.query;

  let queryBranchId = branchId as string | undefined;
  let queryArchdeaconryId =
    archdeaconryId as string | undefined;

  if (req.user.role === 'branch_executive') {
    if (!req.user.branchId) {
      throw new ApiError(
        400,
        'User does not have an assigned branchId.',
      );
    }

    queryBranchId = req.user.branchId;
  } else if (
    req.user.role === 'archdeaconry_executive'
  ) {
    if (!req.user.archdeaconryId) {
      throw new ApiError(
        400,
        'User does not have an assigned archdeaconryId.',
      );
    }

    queryArchdeaconryId = req.user.archdeaconryId;
  } else if (req.user.role === 'youth') {
    throw new ApiError(
      403,
      'Access denied. Youth members cannot view organizational branch reports.',
    );
  } else if (
    req.user.role === 'accra_diocesan_executive' ||
    req.user.role === 'content_manager'
  ) {
    if (req.user.dioceseId) {
      /**
       * Diocesan/content scope is enforced below through
       * the dioceseId query.
       */
    }
  }

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryReports];

    if (queryBranchId) {
      filtered = filtered.filter(
        (report) => report.branchId === queryBranchId,
      );
    }

    if (queryArchdeaconryId) {
      filtered = filtered.filter(
        (report) =>
          report.archdeaconryId === queryArchdeaconryId,
      );
    }

    if (
      req.user.role === 'accra_diocesan_executive' ||
      req.user.role === 'content_manager'
    ) {
      filtered = filtered.filter(
        (report) =>
          report.dioceseId === req.user?.dioceseId,
      );
    }

    if (status) {
      filtered = filtered.filter(
        (report) => report.status === status,
      );
    }

    if (reportingPeriod) {
      filtered = filtered.filter(
        (report) =>
          report.reportingPeriod === reportingPeriod,
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });

    return;
  }

  const query: Record<string, unknown> = {};

  if (queryBranchId) {
    query.branchId = queryBranchId;
  }

  if (queryArchdeaconryId) {
    query.archdeaconryId = queryArchdeaconryId;
  }

  if (
    req.user.role === 'accra_diocesan_executive' ||
    req.user.role === 'content_manager'
  ) {
    query.dioceseId = req.user.dioceseId;
  }

  if (status) {
    query.status = status;
  }

  if (reportingPeriod) {
    query.reportingPeriod = reportingPeriod;
  }

  const reports = await ReportModel.find(query).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: reports.length,
    data: reports.map((report) => report.toJSON()),
  });
};

export const getReportById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canAccessReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. Report is outside your organizational scope.',
      );
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

  if (!canAccessReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. Report is outside your organizational scope.',
    );
  }

  res.status(200).json({
    success: true,
    data: report.toJSON(),
  });
};

export const createReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    title,
    reportingPeriod,
    summary,
    activities,
    attendance,
    achievements,
    challenges,
    recommendations,
  } = req.body;

  /**
   * Branch executives must create reports for their own branch.
   * Organizational IDs are never accepted from the client.
   */
  if (req.user.role === 'branch_executive') {
    if (
      !req.user.branchId ||
      !req.user.archdeaconryId ||
      !req.user.dioceseId
    ) {
      throw new ApiError(
        400,
        'Branch Executive must have complete organizational assignments.',
      );
    }
    if (req.body.branchId && req.body.branchId !== req.user.branchId) {
      throw new ApiError(
        403,
        'Access denied. You cannot create a report for another branch.',
      );
    }
  }

  /**
   * Scoped executive roles receive their organizational
   * identity from the authenticated user.
   *
   * Global administrators may intentionally specify the
   * target organization.
   */
  const isGlobalAdministrator =
    req.user.role === 'admin' ||
    req.user.role === 'super_admin';

  const isDiocesanExecutive =
    req.user.role === 'accra_diocesan_executive';

  const branchId = isGlobalAdministrator
    ? req.body.branchId
    : req.user.branchId;

  const archdeaconryId = isGlobalAdministrator
    ? req.body.archdeaconryId
    : req.user.archdeaconryId;

  const dioceseId = isGlobalAdministrator
    ? req.body.dioceseId || req.user.dioceseId
    : req.user.dioceseId;

  if (!dioceseId) {
    throw new ApiError(
      400,
      'A valid dioceseId is required to create a report.',
    );
  }

  if (isDiocesanExecutive && dioceseId !== req.user.dioceseId) {
    throw new ApiError(
      403,
      'You cannot create a report outside your diocese.',
    );
  }

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

export const updateReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  const {
    title,
    reportingPeriod,
    summary,
    activities,
    attendance,
    achievements,
    challenges,
    recommendations,
  } = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canModifyReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. You cannot modify this report.',
      );
    }

    if (
      req.user.role === 'branch_executive' &&
      req.body.branchId &&
      req.body.branchId !== req.user.branchId
    ) {
      throw new ApiError(
        403,
        'Access denied. You cannot modify reports for another branch.',
      );
    }

    if (
      report.status !== 'draft' &&
      report.status !== 'rejected'
    ) {
      throw new ApiError(
        400,
        `Cannot modify report with status '${report.status}'. Only 'draft' or 'rejected' reports can be updated.`,
      );
    }

    if (title !== undefined) report.title = title;
    if (reportingPeriod !== undefined) {
      report.reportingPeriod = reportingPeriod;
    }
    if (summary !== undefined) report.summary = summary;
    if (activities !== undefined) {
      report.activities = activities;
    }
    if (attendance !== undefined) {
      report.attendance = attendance;
    }
    if (achievements !== undefined) {
      report.achievements = achievements;
    }
    if (challenges !== undefined) {
      report.challenges = challenges;
    }
    if (recommendations !== undefined) {
      report.recommendations = recommendations;
    }

    res.status(200).json({
      success: true,
      message: 'Report updated successfully.',
      data: report,
    });

    return;
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!canModifyReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. You cannot modify this report.',
    );
  }

  if (
    req.user.role === 'branch_executive' &&
    req.body.branchId &&
    req.body.branchId !== req.user.branchId
  ) {
    throw new ApiError(
      403,
      'Access denied. You cannot modify reports for another branch.',
    );
  }

  if (
    report.status !== 'draft' &&
    report.status !== 'rejected'
  ) {
    throw new ApiError(
      400,
      `Cannot modify report with status '${report.status}'. Only 'draft' or 'rejected' reports can be updated.`,
    );
  }

  if (title !== undefined) report.title = title;
  if (reportingPeriod !== undefined) {
    report.reportingPeriod = reportingPeriod;
  }
  if (summary !== undefined) report.summary = summary;
  if (activities !== undefined) {
    report.activities = activities;
  }
  if (attendance !== undefined) {
    report.attendance = attendance;
  }
  if (achievements !== undefined) {
    report.achievements = achievements;
  }
  if (challenges !== undefined) {
    report.challenges = challenges;
  }
  if (recommendations !== undefined) {
    report.recommendations = recommendations;
  }

  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report updated successfully.',
    data: report.toJSON(),
  });
};

export const submitReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canModifyReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. Only the authorized branch executive can submit this report.',
      );
    }

    if (
      report.status !== 'draft' &&
      report.status !== 'rejected'
    ) {
      throw new ApiError(
        400,
        `Report cannot be submitted from current status '${report.status}'.`,
      );
    }

    report.status = 'submitted';

    res.status(200).json({
      success: true,
      message:
        'Branch report submitted successfully for review.',
      data: report,
    });

    return;
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!canModifyReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. Only the authorized branch executive can submit this report.',
    );
  }

  if (
    report.status !== 'draft' &&
    report.status !== 'rejected'
  ) {
    throw new ApiError(
      400,
      `Report cannot be submitted from current status '${report.status}'.`,
    );
  }

  report.status = 'submitted';

  await report.save();

  res.status(200).json({
    success: true,
    message:
      'Branch report submitted successfully for review.',
    data: report.toJSON(),
  });
};

export const reviewReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { reviewComment } = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canAccessReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. Report is outside your organizational scope.',
      );
    }

    if (report.status !== 'submitted') {
      throw new ApiError(
        400,
        `Report cannot be moved to 'under_review' from status '${report.status}'.`,
      );
    }

    report.status = 'under_review';
    report.reviewedBy = req.user.id;

    if (reviewComment) {
      report.reviewComment = reviewComment;
    }

    res.status(200).json({
      success: true,
      message: 'Report is now under review.',
      data: report,
    });

    return;
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!canAccessReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. Report is outside your organizational scope.',
    );
  }

  if (report.status !== 'submitted') {
    throw new ApiError(
      400,
      `Report cannot be moved to 'under_review' from status '${report.status}'.`,
    );
  }

  report.status = 'under_review';
  report.reviewedBy = req.user.id;

  if (reviewComment) {
    report.reviewComment = reviewComment;
  }

  await report.save();

  res.status(200).json({
    success: true,
    message: 'Report is now under review.',
    data: report.toJSON(),
  });
};

export const approveReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { reviewComment } = req.body;

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canAccessReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. Report is outside your organizational scope.',
      );
    }

    if (
      report.status !== 'under_review' &&
      report.status !== 'submitted'
    ) {
      throw new ApiError(
        400,
        `Cannot approve report from status '${report.status}'.`,
      );
    }

    report.status = 'approved';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();

    if (reviewComment) {
      report.reviewComment = reviewComment;
    }

    res.status(200).json({
      success: true,
      message: 'Report approved successfully.',
      data: report,
    });

    return;
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!canAccessReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. Report is outside your organizational scope.',
    );
  }

  if (
    report.status !== 'under_review' &&
    report.status !== 'submitted'
  ) {
    throw new ApiError(
      400,
      `Cannot approve report from status '${report.status}'.`,
    );
  }

  report.status = 'approved';
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();

  if (reviewComment) {
    report.reviewComment = reviewComment;
  }

  await report.save();

  if (report.submittedBy) {
    createNotificationHelper({
      userId: report.submittedBy.toString(),
      title: 'Branch Report Approved',
      message: `Your branch report '${report.title}' has been approved.`,
      type: 'report',
      link: '/dashboard',
    }).catch((err) => console.error(err));
  }

  res.status(200).json({
    success: true,
    message: 'Report approved successfully.',
    data: report.toJSON(),
  });
};

export const rejectReport = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { reviewComment } = req.body;

  if (!reviewComment) {
    throw new ApiError(
      400,
      'A review comment explaining the rejection is required.',
    );
  }

  if (config.useInMemoryMock) {
    const report = inMemoryReports.find(
      (item) => item.id === id,
    );

    if (!report) {
      throw new ApiError(404, 'Report not found.');
    }

    if (!canAccessReport(req, report)) {
      throw new ApiError(
        403,
        'Access denied. Report is outside your organizational scope.',
      );
    }

    if (
      report.status !== 'under_review' &&
      report.status !== 'submitted'
    ) {
      throw new ApiError(
        400,
        `Cannot reject report from status '${report.status}'.`,
      );
    }

    report.status = 'rejected';
    report.reviewedBy = req.user.id;
    report.reviewedAt = new Date();
    report.reviewComment = reviewComment;

    res.status(200).json({
      success: true,
      message:
        'Report rejected and returned to branch executive for revision.',
      data: report,
    });

    return;
  }

  const report = await ReportModel.findById(id);

  if (!report) {
    throw new ApiError(404, 'Report not found.');
  }

  if (!canAccessReport(req, report)) {
    throw new ApiError(
      403,
      'Access denied. Report is outside your organizational scope.',
    );
  }

  if (
    report.status !== 'under_review' &&
    report.status !== 'submitted'
  ) {
    throw new ApiError(
      400,
      `Cannot reject report from status '${report.status}'.`,
    );
  }

  report.status = 'rejected';
  report.reviewedBy = req.user.id;
  report.reviewedAt = new Date();
  report.reviewComment = reviewComment;

  await report.save();

  if (report.submittedBy) {
    createNotificationHelper({
      userId: report.submittedBy.toString(),
      title: 'Branch Report Revision Required',
      message: `Your branch report '${report.title}' requires revision: ${reviewComment}`,
      type: 'warning',
      link: '/dashboard',
    }).catch((err) => console.error(err));
  }

  res.status(200).json({
    success: true,
    message:
      'Report rejected and returned to branch executive for revision.',
    data: report.toJSON(),
  });
};