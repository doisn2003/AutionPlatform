import { Router } from 'express';
import { getSwapHistory, getPoolStats } from '../controllers/swapController';

const router = Router();

router.get('/history', getSwapHistory);
router.get('/stats', getPoolStats);

export default router;
