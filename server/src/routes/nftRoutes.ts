import { Router } from 'express';
import { getUserNFTs } from '../controllers/nftController';

const router = Router();

router.get('/', getUserNFTs);

export default router;
