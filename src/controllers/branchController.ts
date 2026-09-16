import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { BranchModel, IBranch } from '../models/Branch';
import { UserModel } from '../models/User';
import { ReportModel } from '../models/Report';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { inMemoryBranches, inMemoryUsers } from '../utils/mockStore';
import { checkOrgScope } from '../middleware/authorize';


import { archdeaconries as seedArchdeaconries } from '../seed/archdeaconrySeed';

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

  // 1. Fetch custom branch records created in MongoDB
  const dbBranches = await BranchModel.find({ isActive: true }).lean();

  // 2. Extract canonical parishes from archdeaconry configuration
  const canonicalParishes: Record<string, any>[] = [];
  seedArchdeaconries.forEach((arch) => {
    (arch.parishes || []).forEach((p: any) => {
      canonicalParishes.push({
        _id: p.id,
        id: p.id,
        name: p.name.startsWith('St.') || p.name.startsWith('Holy') || p.name.startsWith('Church') || p.name.startsWith('All') || p.name.startsWith('Christ')
          ? `${p.name} Parish`
          : `St. ${p.name} Parish`,
        code: `${p.id.toUpperCase()}-${arch.archdeaconryId.toUpperCase()}`,
        archdeaconryId: arch.archdeaconryId,
        archdeaconryName: arch.name,
        address: p.location ? `${p.location}, Accra` : 'Accra Diocese',
        dioceseId: 'accra',
        status: 'active',
        isOutstation: p.isOutstation || false,
      });
    });
  });

  // 3. Combine custom DB branches and canonical parishes without duplication
  const dbBranchIds = new Set(dbBranches.map((b) => String(b._id || b.id)));
  const mergedBranches: Record<string, any>[] = [
    ...dbBranches.map((b) => ({ ...b, id: String(b._id || b.id) })),
    ...canonicalParishes.filter((p) => !dbBranchIds.has(p.id)),
  ];

  // 4. Fetch approved user leadership info to populate president/chaplain names
  const approvedUsers = await UserModel.find({ isApproved: true }).select('name email role branchId church appointmentHistory').lean();

  const enrichedBranches = mergedBranches.map((branch: Record<string, any>) => {
    const branchUsers = approvedUsers.filter(
      (u) => u.branchId === branch.id || (u.church && u.church.toLowerCase().includes(branch.name.toLowerCase()))
    );

    const execUser = branchUsers.find((u) => u.role === 'branch_executive' || u.role === 'archdeaconry_executive');
    const priestUser = branchUsers.find((u) => u.role === 'accra_diocesan_executive');

    return {
      ...branch,
      memberCount: branchUsers.length,
      presidentName: execUser ? execUser.name : (branch.presidentName || undefined),
      chaplainName: priestUser ? priestUser.name : (branch.chaplainName || undefined),
    };
  });

  // 5. Apply filters
  let filtered: Record<string, any>[] = enrichedBranches;
  if (archdeaconryId && archdeaconryId !== 'all') {
    filtered = filtered.filter((b: Record<string, any>) => b.archdeaconryId === archdeaconryId);
  }
  if (search) {
    const searchStr = String(search).toLowerCase();
    filtered = filtered.filter(
      (b: Record<string, any>) =>
        (b.name && String(b.name).toLowerCase().includes(searchStr)) ||
        (b.code && String(b.code).toLowerCase().includes(searchStr)) ||
        (b.archdeaconryName && String(b.archdeaconryName).toLowerCase().includes(searchStr)) ||
        (b.address && String(b.address).toLowerCase().includes(searchStr))
    );
  }

  res.status(200).json({
    success: true,
    count: filtered.length,
    data: filtered,
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
  const {
    name,
    code,
    description,
    location,
    address,
    archdeaconryId,
    archdeaconryName,
    dioceseId,
    executiveIds,
    contactEmail,
    contactPhone,
    presidentName,
    secretaryName,
    chaplainName,
    status,
  } = req.body;

  // Auto-generate uppercase code if not provided
  let upperCode = code ? code.trim().toUpperCase() : '';
  if (!upperCode) {
    const acronym = name
      .split(' ')
      .map((w: string) => w[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 4);
    upperCode = `${acronym || 'BR'}-${Math.floor(100 + Math.random() * 900)}`;
  }

  const effectiveDioceseId = dioceseId || 'accra';
  const effectiveLocation = location || address || '';

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
      location: effectiveLocation,
      archdeaconryId,
      dioceseId: effectiveDioceseId,
      executiveIds: executiveIds || [],
      isActive: status !== 'inactive',
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
    location: effectiveLocation,
    archdeaconryId,
    dioceseId: effectiveDioceseId,
    executiveIds: executiveIds || [],
    isActive: status !== 'inactive',
    contactEmail: contactEmail || '',
    contactPhone: contactPhone || '',
    presidentName: presidentName || '',
    secretaryName: secretaryName || '',
    chaplainName: chaplainName || '',
  });


  res.status(201).json({
    success: true,
    message: 'Branch created successfully.',
    data: {
      ...newBranch.toJSON(),
      address: effectiveLocation,
      contactEmail,
      contactPhone,
      presidentName,
      secretaryName,
      chaplainName,
      archdeaconryName,
      status: status || 'active',
    },
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
    const branch = inMemoryBranches[idx];
    const userCount = inMemoryUsers.filter((u) => u.branchId === branch.id).length;
    if (userCount > 0) {
      throw new ApiError(
        400,
        'Cannot hard-delete branch because active registered members exist under it. Please deactivate the branch instead.'
      );
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

  // Dependency Protection Audit Check:
  const userCount = await UserModel.countDocuments({ branchId: branch.id });
  const reportCount = await ReportModel.countDocuments({ branchId: branch.id });

  if (userCount > 0 || reportCount > 0) {
    throw new ApiError(
      400,
      `Cannot hard-delete branch because it has active dependencies (${userCount} users, ${reportCount} reports). Please deactivate the branch instead.`
    );
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
