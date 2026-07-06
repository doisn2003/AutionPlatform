import { Router } from 'express';
import { getTransactionHistory } from '../controllers/transactionController';

const router = Router();

router.get('/history', getTransactionHistory);

export default router;
