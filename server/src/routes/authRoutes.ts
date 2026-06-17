import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe, updateProfile, forgotPassword, resetPassword, getUserById, sendOTP, verifyOTP, getUsers } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.post(
  '/register',
  [
    body('name').notEmpty().withMessage('Name is required').trim(),
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['entrepreneur', 'investor']).withMessage('Role must be entrepreneur or investor'),
    validate
  ],
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    validate
  ],
  login
);

router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserById);

router.put('/profile', protect, updateProfile);

router.post(
  '/forgot-password',
  [
    body('email').isEmail().withMessage('Invalid email').normalizeEmail(),
    validate
  ],
  forgotPassword
);

router.post(
  '/reset-password/:token',
  [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    validate
  ],
  resetPassword
);

router.post('/otp/send', protect, sendOTP);
router.post(
  '/otp/verify',
  [
    protect,
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 characters'),
    validate
  ],
  verifyOTP
);

export default router;

