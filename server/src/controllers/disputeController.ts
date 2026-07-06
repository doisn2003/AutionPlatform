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
 * Tải file bằng chứng nộp phạt lên Pinata IPFS
 */
export const uploadEvidence = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const PINATA_API_KEY = process.env.PINATA_API_KEY;
    const PINATA_SECRET_API_KEY = process.env.PINATA_SECRET_API_KEY;

    if (!PINATA_API_KEY || !PINATA_SECRET_API_KEY) {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      return res.status(500).json({ error: 'Pinata keys are not configured' });
    }

    // Gửi tệp lên Pinata IPFS
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData.getBoundary()}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_API_KEY,
      },
    });

    // Xoá tệp tạm cục bộ
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const ipfsHash = `ipfs://${response.data.IpfsHash}`;
    res.status(200).json({
      success: true,
      ipfsHash,
    });
  } catch (error: any) {
    console.error('IPFS upload error:', error.response?.data || error.message);
    
    // Đảm bảo xoá tệp tạm khi gặp lỗi
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: error.message });
  }
};
