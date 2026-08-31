import { Response } from 'express';

import { AuthenticatedRequest } from '../middleware/auth';

import {
  TaskModel,
  ITask,
  TaskStatus,
  TaskPriority,
} from '../models/Task';

import { ApiError } from '../utils/ApiError';

import { config } from '../config/env';

import { inMemoryTasks } from '../utils/mockStore';

import { checkOrgScope } from '../middleware/authorize';

const canAccessTask = (
  req: AuthenticatedRequest,
  task: { assignedTo?: string; branchId?: string; archdeaconryId?: string; dioceseId?: string },
): boolean => {
  if (!req.user) {
    return false;
  }

  if (
    req.user.role === 'super_admin' ||
    req.user.role === 'admin'
  ) {
    return true;
  }

  /**
   * A task explicitly assigned to the authenticated user
   * is accessible to that user.
   */
  if (
    task.assignedTo &&
    task.assignedTo === req.user.id
  ) {
    return true;
  }

  /**
   * Otherwise the task must fall inside the user's
   * organizational scope.
   */
  return checkOrgScope(req.user, {
    branchId: task.branchId,
    archdeaconryId: task.archdeaconryId,
    dioceseId: task.dioceseId,
  });
};

const canModifyTask = (
  req: AuthenticatedRequest,
  task: { assignedTo?: string; createdBy?: string; branchId?: string; archdeaconryId?: string; dioceseId?: string },
): boolean => {
  if (!canAccessTask(req, task)) {
    return false;
  }

  if (!req.user) {
    return false;
  }

  if (
    req.user.role === 'super_admin' ||
    req.user.role === 'admin' ||
    req.user.role === 'accra_diocesan_executive'
  ) {
    return true;
  }

  return (
    task.assignedTo === req.user.id ||
    task.createdBy === req.user.id
  );
};

const applyTaskUpdates = (
  task: {
    title?: string;
    description?: string;
    assignedTo?: string;
    assignedRole?: ITask['assignedRole'];
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: Date;
    completedAt?: Date;
  },
  updates: {
    title?: string;
    description?: string;
    assignedTo?: string;
    assignedRole?: ITask['assignedRole'];
    priority?: TaskPriority;
    status?: TaskStatus;
    dueDate?: string | Date | null;
  },
): void => {
  /**
   * Only workflow fields are editable.
   *
   * Never accept:
   * - createdBy
   * - branchId
   * - archdeaconryId
   * - dioceseId
   */
  if (updates.title !== undefined) {
    task.title = updates.title;
  }

  if (updates.description !== undefined) {
    task.description = updates.description;
  }

  if (updates.assignedTo !== undefined) {
    task.assignedTo = updates.assignedTo;
  }

  if (updates.assignedRole !== undefined) {
    task.assignedRole = updates.assignedRole;
  }

  if (updates.priority !== undefined) {
    task.priority = updates.priority;
  }

  if (updates.status !== undefined) {
    task.status = updates.status;
  }

  if (updates.dueDate !== undefined) {
    task.dueDate = updates.dueDate
      ? new Date(updates.dueDate)
      : undefined;
  }

  if (
    updates.status === 'completed' &&
    !task.completedAt
  ) {
    task.completedAt = new Date();
  }

  if (
    updates.status &&
    updates.status !== 'completed'
  ) {
    task.completedAt = undefined;
  }
};

export const getTasks = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    status,
    priority,
    assignedTo,
    branchId,
    archdeaconryId,
  } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryTasks];

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin'
    ) {
      filtered = filtered.filter((task) =>
        canAccessTask(req, task),
      );
    }

    if (status) {
      filtered = filtered.filter(
        (task) => task.status === status,
      );
    }

    if (priority) {
      filtered = filtered.filter(
        (task) => task.priority === priority,
      );
    }

    if (assignedTo) {
      filtered = filtered.filter(
        (task) => task.assignedTo === assignedTo,
      );
    }

    /**
     * Query filters are applied only AFTER the user's
     * organizational scope has been established.
     */
    if (branchId) {
      filtered = filtered.filter(
        (task) => task.branchId === branchId,
      );
    }

    if (archdeaconryId) {
      filtered = filtered.filter(
        (task) =>
          task.archdeaconryId === archdeaconryId,
      );
    }

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered,
    });

    return;
  }

  const scopeConditions: Record<string, unknown>[] = [];

  if (
    req.user.role === 'admin' ||
    req.user.role === 'super_admin'
  ) {
    /**
     * Global administrators can see all tasks.
     */
  } else {
    scopeConditions.push({
      assignedTo: req.user.id,
    });

    if (req.user.branchId) {
      scopeConditions.push({
        branchId: req.user.branchId,
      });
    }

    if (req.user.archdeaconryId) {
      scopeConditions.push({
        archdeaconryId: req.user.archdeaconryId,
      });
    }

    if (req.user.dioceseId) {
      scopeConditions.push({
        dioceseId: req.user.dioceseId,
      });
    }
  }

  const baseQuery: Record<string, unknown> = {};

  if (scopeConditions.length > 0) {
    baseQuery.$or = scopeConditions;
  }

  if (status) {
    baseQuery.status = status;
  }

  if (priority) {
    baseQuery.priority = priority;
  }

  if (assignedTo) {
    baseQuery.assignedTo = assignedTo;
  }

  /**
   * Do not allow arbitrary branch/archdeaconry query
   * parameters to bypass the user's scope.
   *
   * They are intersected with the existing scope query.
   */
  if (branchId) {
    if (baseQuery.$or) {
      baseQuery.$and = [
        { $or: baseQuery.$or },
        { branchId },
      ];

      delete baseQuery.$or;
    } else {
      baseQuery.branchId = branchId;
    }
  }

  if (archdeaconryId) {
    if (baseQuery.$and) {
      (
        baseQuery.$and as Record<string, unknown>[]
      ).push({
        archdeaconryId,
      });
    } else {
      baseQuery.archdeaconryId = archdeaconryId;
    }
  }

  const tasks = await TaskModel.find(baseQuery).sort({
    dueDate: 1,
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks.map((task) => task.toJSON()),
  });
};

export const getTaskById = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  if (config.useInMemoryMock) {
    const task = inMemoryTasks.find(
      (item) => item.id === id,
    );

    if (!task) {
      throw new ApiError(404, 'Task not found.');
    }

    if (!canAccessTask(req, task)) {
      throw new ApiError(
        403,
        'Access denied. You do not have permission to access this task.',
      );
    }

    res.status(200).json({
      success: true,
      data: task,
    });

    return;
  }

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (!canAccessTask(req, task)) {
    throw new ApiError(
      403,
      'Access denied. You do not have permission to access this task.',
    );
  }

  res.status(200).json({
    success: true,
    data: task.toJSON(),
  });
};

export const createTask = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    title,
    description,
    assignedTo,
    assignedRole,
    priority,
    dueDate,
  } = req.body;

  /**
   * Organizational ownership comes from the authenticated
   * user, not arbitrary client-supplied IDs.
   */
  const isGlobalAdministrator =
    req.user.role === 'admin' ||
    req.user.role === 'super_admin';

  const dioceseId = isGlobalAdministrator
    ? req.body.dioceseId || req.user.dioceseId
    : req.user.dioceseId;

  const branchId = isGlobalAdministrator
    ? req.body.branchId
    : req.user.branchId;

  const archdeaconryId = isGlobalAdministrator
    ? req.body.archdeaconryId
    : req.user.archdeaconryId;

  if (!dioceseId) {
    throw new ApiError(
      400,
      'A valid dioceseId is required to create a task.',
    );
  }

  if (config.useInMemoryMock) {
    const newTask: ITask = {
      id: Date.now().toString(),

      title,
      description,

      createdBy: req.user.id,

      assignedTo: assignedTo || '',
      assignedRole: assignedRole || undefined,

      branchId: branchId || '',
      archdeaconryId: archdeaconryId || '',
      dioceseId,

      priority:
        (priority as TaskPriority) || 'medium',

      status: 'pending',

      dueDate: dueDate
        ? new Date(dueDate)
        : undefined,
    };

    inMemoryTasks.push(newTask);

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      data: newTask,
    });

    return;
  }

  const newTask = await TaskModel.create({
    title,
    description,

    createdBy: req.user.id,

    assignedTo,
    assignedRole,

    branchId,
    archdeaconryId,
    dioceseId,

    priority: priority || 'medium',
    status: 'pending',

    dueDate: dueDate
      ? new Date(dueDate)
      : undefined,
  });

  res.status(201).json({
    success: true,
    message: 'Task created successfully.',
    data: newTask.toJSON(),
  });
};

export const updateTask = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  const {
    title,
    description,
    assignedTo,
    assignedRole,
    priority,
    status,
    dueDate,
  } = req.body;

  const updates = {
    title,
    description,
    assignedTo,
    assignedRole,
    priority,
    status,
    dueDate,
  };

  if (config.useInMemoryMock) {
    const task = inMemoryTasks.find(
      (item) => item.id === id,
    );

    if (!task) {
      throw new ApiError(404, 'Task not found.');
    }

    if (!canModifyTask(req, task)) {
      throw new ApiError(
        403,
        'Access denied. You do not have permission to modify this task.',
      );
    }

    applyTaskUpdates(task, updates);

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      data: task,
    });

    return;
  }

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (!canModifyTask(req, task)) {
    throw new ApiError(
      403,
      'Access denied. You do not have permission to modify this task.',
    );
  }

  applyTaskUpdates(task, updates);

  await task.save();

  res.status(200).json({
    success: true,
    message: 'Task updated successfully.',
    data: task.toJSON(),
  });
};

export const updateTaskStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { status } = req.body;

  if (config.useInMemoryMock) {
    const task = inMemoryTasks.find(
      (item) => item.id === id,
    );

    if (!task) {
      throw new ApiError(404, 'Task not found.');
    }

    if (!canModifyTask(req, task)) {
      throw new ApiError(
        403,
        'Access denied. You do not have permission to update this task.',
      );
    }

    task.status = status as TaskStatus;

    if (status === 'completed') {
      task.completedAt = new Date();
    } else {
      task.completedAt = undefined;
    }

    res.status(200).json({
      success: true,
      message: `Task status updated to '${status}'.`,
      data: task,
    });

    return;
  }

  const task = await TaskModel.findById(id);

  if (!task) {
    throw new ApiError(404, 'Task not found.');
  }

  if (!canModifyTask(req, task)) {
    throw new ApiError(
      403,
      'Access denied. You do not have permission to update this task.',
    );
  }

  task.status = status as TaskStatus;

  if (status === 'completed') {
    task.completedAt = new Date();
  } else {
    task.completedAt = undefined;
  }

  await task.save();

  res.status(200).json({
    success: true,
    message: `Task status updated to '${status}'.`,
    data: task.toJSON(),
  });
};