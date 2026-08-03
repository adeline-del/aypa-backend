import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserModel, IUser } from '../models/User';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';

// In-Memory Database Fallback Store
let inMemoryUsers: IUser[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    password: 'password123',
    role: 'youth',
    profileImage: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2023-01-15',
    isApproved: true,
  },
  {
    id: '2',
    name: 'Rev. Michael Adams',
    email: 'michael@example.com',
    password: 'password123',
    role: 'executive',
    profileImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
    memberSince: '2020-03-20',
    isApproved: true,
  },
];

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (config.useInMemoryMock) {
    const user = inMemoryUsers.find((u) => u.email === email && u.password === password);
    if (!user) {
      throw new ApiError(401, 'Invalid credentials or user does not exist.');
    }
    if (!user.isApproved) {
      throw new ApiError(403, 'Account pending executive approval.');
    }
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userWithoutPassword,
        token: `token_${user.id}_${Date.now()}`,
      },
    });
    return;
  }

  const userDoc = await UserModel.findOne({ email });
  if (!userDoc || userDoc.password !== password) {
    throw new ApiError(401, 'Invalid credentials or user does not exist.');
  }

  if (!userDoc.isApproved) {
    throw new ApiError(403, 'Account pending executive approval.');
  }

  const userJSON = userDoc.toJSON();
  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: userJSON,
      token: `token_${userJSON.id}_${Date.now()}`,
    },
  });
};

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, role, church, phone } = req.body;

  if (config.useInMemoryMock) {
    const existing = inMemoryUsers.find((u) => u.email === email);
    if (existing) {
      throw new ApiError(400, 'User with this email already exists.');
    }

    const newUser: IUser = {
      id: Date.now().toString(),
      name,
      email,
      password,
      role,
      church: church || '',
      phone: phone || '',
      memberSince: new Date().toISOString().split('T')[0],
      isApproved: role === 'youth', // Youth auto-approved, executive needs approval
    };

    inMemoryUsers.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: newUser.isApproved
        ? 'Registration successful.'
        : 'Registration submitted! Executive approval pending.',
      data: {
        user: userWithoutPassword,
        token: `token_${newUser.id}_${Date.now()}`,
      },
    });
    return;
  }

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, 'User with this email already exists.');
  }

  const isApproved = role === 'youth';
  const newUserDoc = await UserModel.create({
    name,
    email,
    password,
    role,
    church,
    phone,
    memberSince: new Date().toISOString().split('T')[0],
    isApproved,
  });

  const userJSON = newUserDoc.toJSON();
  res.status(201).json({
    success: true,
    message: isApproved
      ? 'Registration successful.'
      : 'Registration submitted! Executive approval pending.',
    data: {
      user: userJSON,
      token: `token_${userJSON.id}_${Date.now()}`,
    },
  });
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (config.useInMemoryMock) {
    const mockUser = inMemoryUsers.find((u) => u.id === req.user?.id) || inMemoryUsers[0];
    const { password: _, ...userWithoutPassword } = mockUser;

    res.status(200).json({
      success: true,
      data: userWithoutPassword,
    });
    return;
  }

  const userDoc = await UserModel.findById(req.user?.id);
  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  res.status(200).json({
    success: true,
    data: userDoc.toJSON(),
  });
};
