import express from 'express';
import {
  getLeadActivities,
  createActivity,
  updateActivity,
  deleteActivity,
} from '../controllers/activityController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All activity routes require authentication
router.use(authenticate);

router.get('/lead/:leadId', getLeadActivities);
router.post('/lead/:leadId', createActivity);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;

