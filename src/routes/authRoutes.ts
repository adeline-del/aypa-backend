import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';
import {
  loginUser,
  registerUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updateProfile,
  changePassword,
} from '../controllers/authController';

const router = Router();

router.post('/login', validateRequest(loginSchema), asyncHandler(loginUser));
router.post('/register', validateRequest(registerSchema), asyncHandler(registerUser));
router.post('/forgot-password', validateRequest(forgotPasswordSchema), asyncHandler(forgotPassword));
router.post('/reset-password', validateRequest(resetPasswordSchema), asyncHandler(resetPassword));
router.get('/me', authenticate, asyncHandler(getCurrentUser));
router.put('/profile', authenticate, asyncHandler(updateProfile));
router.put('/change-password', authenticate, asyncHandler(changePassword));

export default router;
