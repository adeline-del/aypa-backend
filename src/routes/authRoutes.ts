import { Router } from 'express';
import { validateRequest } from '../middleware/validate';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { loginSchema, registerSchema } from '../validators/auth.validator';
import {
  loginUser,
  registerUser,
  getCurrentUser,
} from '../controllers/authController';

const router = Router();

router.post('/login', validateRequest(loginSchema), asyncHandler(loginUser));
router.post('/register', validateRequest(registerSchema), asyncHandler(registerUser));
router.get('/me', authenticate, asyncHandler(getCurrentUser));

export default router;
