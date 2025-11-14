import express from 'express';
import { getDashboardStats } from '../controllers/dashboardController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(authenticate);

router.get('/stats', getDashboardStats);

export default router;

