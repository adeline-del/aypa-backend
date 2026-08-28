import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BranchModel, IBranch } from '../models/Branch';
import { UserModel } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { inMemoryBranches, inMemoryUsers } from '../utils/mockStore';
import { checkOrgScope } from '../middleware/authorize';

export const getBranches = async (req: Request, res: Response): Promise<void> => {
  const { archdeaconryId, search } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryBranches];
    if (archdeaconryId) {
      filtered = filtered.filter((b) => b.archdeaconryId === archdeaconryId);
    }
    if (search) {
      const searchStr = (search as string).toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.name.toLowerCase().includes(searchStr) ||
          b.code.toLowerCase().includes(searchStr)
      );
    }
    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
    return;
  }

  const query: Record<string, any> = { isActive: true };
  if (archdeaconryId) query.archdeaconryId = archdeaconryId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const branches = await BranchModel.find(query).sort({ name: 1 });
  res.status(200).json({
    success: true,
    count: branches.length,
    data: branches.map((b) => b.toJSON()),
  });
};

export const getBranchById = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  if (config.useInMemoryMock) {
    const branch = inMemoryBranches.find((b) => b.id === id || b.code === id.toUpperCase());
    if (!branch) {
      throw new ApiError(404, 'Branch not found.');
    }
    res.status(200).json({
      success: true,
      data: branch,
    });
    return;
  }

  const branch = await BranchModel.findOne({
    $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { code: id.toUpperCase() }],
  });

  if (!branch) {
    throw new ApiError(404, 'Branch not found.');
  }

  res.status(200).json({
    success: true,
    data: branch.toJSON(),
  });
};

export const createBranch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { name, code, description, location, archdeaconryId, dioceseId, executiveIds } = req.body;
  const upperCode = code.toUpperCase();
  const effectiveDioceseId = dioceseId || 'accra';

  if (config.useInMemoryMock) {
    const existing = inMemoryBranches.find((b) => b.code === upperCode);
    if (existing) {
      throw new ApiError(400, `Branch with code '${upperCode}' already exists.`);
    }

    const newBranch: IBranch = {
      id: Date.now().toString(),
      name,
      code: upperCode,
      description: description || '',
      location: location || '',
      archdeaconryId,
      dioceseId: effectiveDioceseId,
      executiveIds: executiveIds || [],
      isActive: true,
    };

    inMemoryBranches.push(newBranch);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully.',
      data: newBranch,
    });
    return;
  }

  const existingBranch = await BranchModel.findOne({ code: upperCode });
  if (existingBranch) {
    throw new ApiError(400, `Branch with code '${upperCode}' already exists.`);
  }

  const newBranch = await BranchModel.create({
    name,
    code: upperCode,
    description,
    location,
    archdeaconryId,
    dioceseId: effectiveDioceseId,
    executiveIds: executiveIds || [],
    isActive: true,
  });

  res.status(201).json({
    success: true,
    message: 'Branch created successfully.',
    data: newBranch.toJSON(),
  });
};

export const updateBranch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const updates = req.body;

  if (config.useInMemoryMock) {
    const branch = inMemoryBranches.find((b) => b.id === id);
    if (!branch) {
      throw new ApiError(404, 'Branch not found.');
    }

    // Verify scope permissions
    if (req.user && !checkOrgScope(req.user, { branchId: branch.id, archdeaconryId: branch.archdeaconryId })) {
      throw new ApiError(403, 'Access denied. You can only update branches within your assigned scope.');
    }

    Object.assign(branch, updates);
    res.status(200).json({
      success: true,
      message: 'Branch updated successfully.',
      data: branch,
    });
    return;
  }

  const branch = await BranchModel.findById(id);
  if (!branch) {
    throw new ApiError(404, 'Branch not found.');
  }

  if (req.user && !checkOrgScope(req.user, { branchId: branch.id, archdeaconryId: branch.archdeaconryId })) {
    throw new ApiError(403, 'Access denied. You can only update branches within your assigned scope.');
  }

  Object.assign(branch, updates);
  await branch.save();

  res.status(200).json({
    success: true,
    message: 'Branch updated successfully.',
    data: branch.toJSON(),
  });
};

export const deleteBranch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (config.useInMemoryMock) {
    const idx = inMemoryBranches.findIndex((b) => b.id === id);
    if (idx === -1) {
      throw new ApiError(404, 'Branch not found.');
    }
    inMemoryBranches.splice(idx, 1);
    res.status(200).json({
      success: true,
      message: 'Branch deleted successfully.',
    });
    return;
  }

  const branch = await BranchModel.findById(id);
  if (!branch) {
    throw new ApiError(404, 'Branch not found.');
  }

  await branch.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Branch deleted successfully.',
  });
};

export const getBranchMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  if (config.useInMemoryMock) {
    const branch = inMemoryBranches.find((b) => b.id === id);
    if (!branch) {
      throw new ApiError(404, 'Branch not found.');
    }

    if (req.user && !checkOrgScope(req.user, { branchId: branch.id, archdeaconryId: branch.archdeaconryId })) {
      throw new ApiError(403, 'Access denied. Cannot view members outside your assigned branch or archdeaconry.');
    }

    const members = inMemoryUsers.filter((u) => u.branchId === branch.id);
    const safeMembers = members.map(({ passwordHash: _, ...u }) => u);

    res.status(200).json({
      success: true,
      count: safeMembers.length,
      data: safeMembers,
    });
    return;
  }

  const branch = await BranchModel.findById(id);
  if (!branch) {
    throw new ApiError(404, 'Branch not found.');
  }

  if (req.user && !checkOrgScope(req.user, { branchId: branch.id, archdeaconryId: branch.archdeaconryId })) {
    throw new ApiError(403, 'Access denied. Cannot view members outside your assigned branch or archdeaconry.');
  }

  const members = await UserModel.find({ branchId: branch.id });

  res.status(200).json({
    success: true,
    count: members.length,
    data: members.map((m) => m.toJSON()),
  });
};
