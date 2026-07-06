/**
 * Auction Routes — Express Router cho /api/auctions
 */

import { Router } from 'express';
import { getAuctions, getAuctionById, getAuctionBids, updateAuctionCategory, updateAuctionCategoryByNft } from '../controllers/auctionController';

const router = Router();

// GET /api/auctions?status=active|ended|all
router.get('/', getAuctions);

// GET /api/auctions/:id
router.get('/:id', getAuctionById);

// GET /api/auctions/:id/bids
router.get('/:id/bids', getAuctionBids);

// PUT /api/auctions/:id/category
router.put('/:id/category', updateAuctionCategory);

// PUT /api/auctions/by-nft/:tokenId/category
router.put('/by-nft/:tokenId/category', updateAuctionCategoryByNft);

export default router;
