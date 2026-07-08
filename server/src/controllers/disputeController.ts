import { Request, Response } from 'express';
import fs from 'node:fs';
import FormData from 'form-data';
import axios from 'axios';
import pool from '../config/db';

/**
 * Lấy chi tiết vụ tranh chấp & thông tin bỏ phiếu của các Trọng tài
 */
export const getDisputeDetail = async (req: Request, res: Response) => {
  const disputeId = parseInt(req.params.id as string);

  if (isNaN(disputeId)) {
    return res.status(400).json({ error: 'Invalid dispute ID' });
  }

  try {
    // 1. Truy vấn thông tin tranh chấp và thông tin đấu giá liên kết
    const disputeQuery = await pool.query(
      `SELECT d.*, a.asset_type, a.dispute_type, a.nft_token_id
       FROM disputes d
       JOIN auctions a ON d.auction_id = a.auction_id
       WHERE d.dispute_id = $1`,
      [disputeId]
    );

    if (disputeQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const dispute = disputeQuery.rows[0];

    // 2. Truy vấn danh sách các phiếu bầu của trọng tài
    const votesQuery = await pool.query(
      `SELECT juror, has_committed, has_revealed, revealed_vote, reward_amount, penalty_amount, tx_hash, block_number, updated_at
       FROM dispute_votes
       WHERE dispute_id = $1`,
      [disputeId]
    );

    res.status(200).json({
      success: true,
      dispute,
      votes: votesQuery.rows,
    });
  } catch (error: any) {
    console.error('Error fetching dispute details:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Lấy danh sách các vụ tranh chấp mà địa chỉ ví được chọn làm Trọng tài
 */
export const getDisputesForJuror = async (req: Request, res: Response) => {
  const jurorAddress = req.params.address as string;

  if (!jurorAddress || !jurorAddress.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid juror address' });
  }

  try {
    const jurorLower = jurorAddress.toLowerCase();
    const disputesQuery = await pool.query(
      `SELECT d.*, dv.has_committed, dv.has_revealed, dv.revealed_vote, dv.reward_amount, dv.penalty_amount
       FROM disputes d
       JOIN dispute_votes dv ON d.dispute_id = dv.dispute_id
       WHERE LOWER(dv.juror) = $1
       ORDER BY d.created_at DESC`,
      [jurorLower]
    );

    res.status(200).json({
      success: true,
      disputes: disputesQuery.rows,
    });
  } catch (error: any) {
    console.error('Error fetching disputes for juror:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tải file bằng chứng nộp phạt lên Pinata IPFS (Hỗ trợ nhiều hình ảnh & Lưu database off-chain)
 */
export const uploadEvidence = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const { description, auctionId, initiator } = req.body;

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  if (!auctionId || isNaN(parseInt(auctionId as string, 10))) {
    return res.status(400).json({ error: 'Invalid auction ID' });
  }
  if (!initiator || !initiator.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid initiator address' });
  }

  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

  if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
    // Dọn dẹp file tạm
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    return res.status(500).json({ error: 'Pinata keys are not configured' });
  }

  try {
    const ipfsUrls: string[] = [];

    // 1. Tải từng file hình ảnh lên Pinata IPFS
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(file.path));

      const uploadResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_API_KEY,
        },
      });

      // Xoá file tạm
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      ipfsUrls.push(`ipfs://${uploadResponse.data.IpfsHash}`);
    }

    // 2. Tạo JSON metadata chứa description và mảng hình ảnh
    const metadata = {
      description,
      images: ipfsUrls,
      timestamp: new Date().toISOString()
    };

    const metadataResponse = await axios.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', metadata, {
      headers: {
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    const metadataIpfsHash = `ipfs://${metadataResponse.data.IpfsHash}`;

    // 3. Lưu trữ song song vào Database off-chain
    const numericAuctionId = parseInt(auctionId as string, 10);
    
    // Lấy thông tin người mua, người bán từ bảng auctions
    const auctionQuery = await pool.query(
      `SELECT seller, current_top_bidder FROM auctions WHERE auction_id = $1`,
      [numericAuctionId]
    );

    if (auctionQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const { seller, current_top_bidder: buyer } = auctionQuery.rows[0];
    const isBuyerInitiator = initiator.toLowerCase() === buyer.toLowerCase();
    
    // Tạo dispute_id tạm âm (ví dụ: -auctionId) để tránh trùng lặp UNIQUE constraint
    const tempDisputeId = -numericAuctionId;

    if (isBuyerInitiator) {
      await pool.query(
        `INSERT INTO disputes (
           dispute_id, auction_id, buyer, seller, initiator, 
           buyer_evidence_ipfs, buyer_description, buyer_images,
           phase
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'EVIDENCE')
         ON CONFLICT (auction_id) DO UPDATE SET
           buyer_evidence_ipfs = EXCLUDED.buyer_evidence_ipfs,
           buyer_description = EXCLUDED.buyer_description,
           buyer_images = EXCLUDED.buyer_images,
           updated_at = NOW()`,
        [tempDisputeId, numericAuctionId, buyer.toLowerCase(), seller.toLowerCase(), initiator.toLowerCase(), metadataIpfsHash, description, ipfsUrls]
      );
    } else {
      await pool.query(
        `INSERT INTO disputes (
           dispute_id, auction_id, buyer, seller, initiator, 
           seller_evidence_ipfs, seller_description, seller_images,
           phase
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'EVIDENCE')
         ON CONFLICT (auction_id) DO UPDATE SET
           seller_evidence_ipfs = EXCLUDED.seller_evidence_ipfs,
           seller_description = EXCLUDED.seller_description,
           seller_images = EXCLUDED.seller_images,
           updated_at = NOW()`,
        [tempDisputeId, numericAuctionId, buyer.toLowerCase(), seller.toLowerCase(), initiator.toLowerCase(), metadataIpfsHash, description, ipfsUrls]
      );
    }

    res.status(200).json({
      success: true,
      ipfsHash: metadataIpfsHash,
      buyer_description: isBuyerInitiator ? description : null,
      buyer_images: isBuyerInitiator ? ipfsUrls : null,
      seller_description: !isBuyerInitiator ? description : null,
      seller_images: !isBuyerInitiator ? ipfsUrls : null
    });

  } catch (error: any) {
    console.error('IPFS upload error:', error.response?.data || error.message);
    
    // Đảm bảo xoá sạch file tạm nếu gặp lỗi giữa chừng
    for (const file of files) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    }
    
    res.status(500).json({ error: error.message });
  }
};
