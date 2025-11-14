import express from 'express';
import {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
} from '../controllers/leadController.js';
import { authenticate } from '../middlewares/auth.js';

const router = express.Router();

// All lead routes require authentication
router.use(authenticate);

router.get('/', getLeads);
router.get('/:id', getLead);
router.post('/', createLead);
router.put('/:id', updateLead);
router.delete('/:id', deleteLead);

export default router;

