import express from 'express';
import {
  register,
  login,
  getCurrentUser,
  getUsers,
} from '../controllers/authController.js';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';

const router = express.Router();

// Public routes
router.post('/register', authenticate, authorize('ADMIN'), register); // Only admin can register
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.get('/users', authenticate, authorize('ADMIN', 'MANAGER'), getUsers);

export default router;

