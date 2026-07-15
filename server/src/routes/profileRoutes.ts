import { Router } from 'express';
import { getProfile, updateProfile, getLeaderboard, mockStake, faucetGas } from '../controllers/profileController';

const router = Router();

router.get('/leaderboard', getLeaderboard);
router.post('/faucet-gas', faucetGas);
router.get('/:address', getProfile);
router.post('/update', updateProfile);
router.post('/mock-stake', mockStake);

export default router;
