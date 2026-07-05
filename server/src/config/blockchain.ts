/**
 * Blockchain Configuration — Viem client + Contract ABIs
 * 
 * Khởi tạo publicClient và walletClient kết nối đến blockchain node.
 * Import ABI trực tiếp (hardcoded) để tránh đọc file runtime.
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { hardhat } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import dotenv from 'dotenv';

dotenv.config();

// ---- Chain Config ----
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';

export const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(RPC_URL),
});

// WalletClient dùng cho cron job (endAuction) 
// Dùng private key deployer từ Hardhat local node (account #0)
const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

export const walletClient = DEPLOYER_PRIVATE_KEY
  ? createWalletClient({
      account: privateKeyToAccount(DEPLOYER_PRIVATE_KEY),
      chain: hardhat,
      transport: http(RPC_URL),
    })
  : null;

// ---- Contract Addresses ----
export const CONTRACT_ADDRESSES = {
  ADF: (process.env.ADF_ADDRESS || '0x') as Address,
  ADF_Pool: (process.env.ADF_POOL_ADDRESS || '0x') as Address,
  ADF_NFT: (process.env.ADF_NFT_ADDRESS || '0x') as Address,
  AuctionExchange: (process.env.AUCTION_EXCHANGE_ADDRESS || '0x') as Address,
};

// ---- ABIs ----
// Chỉ giữ lại các hàm/event cần thiết cho server

export const AUCTION_EXCHANGE_ABI = [
  // Events
  {
    type: 'event',
    name: 'AuctionCreated',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'seller', type: 'address', indexed: true },
      { name: 'nftTokenId', type: 'uint256', indexed: false },
      { name: 'endTime', type: 'uint256', indexed: false },
      { name: 'reservePrice', type: 'uint256', indexed: false },
      { name: 'minBidIncrement', type: 'uint256', indexed: false },
      { name: 'assetType', type: 'uint8', indexed: false },
      { name: 'disputeType', type: 'uint8', indexed: false },
      { name: 'escrowDuration', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'BidPlaced',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'bidder', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionEnded',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
      { name: 'winner', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'AuctionCanceled',
    inputs: [
      { name: 'auctionId', type: 'uint256', indexed: true },
    ],
  },
  // Functions
  {
    type: 'function',
    name: 'endAuction',
    inputs: [{ name: '_auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'auctions',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'nftTokenId', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'reservePrice', type: 'uint256' },
      { name: 'minBidIncrement', type: 'uint256' },
      { name: 'currentTopBidder', type: 'address' },
      { name: 'currentTopBid', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'assetType', type: 'uint8' },
      { name: 'disputeType', type: 'uint8' },
      { name: 'phase', type: 'uint8' },
      { name: 'escrowDuration', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export const ADF_NFT_ABI = [
  {
    type: 'event',
    name: 'NFTMinted',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  }
] as const;

export const ADF_POOL_ABI = [
  {
    type: 'event',
    name: 'SwapETHForADF',
    inputs: [
      { name: 'buyer', type: 'address', indexed: true },
      { name: 'ethIn', type: 'uint256', indexed: false },
      { name: 'adfOut', type: 'uint256', indexed: false },
      { name: 'feeCollected', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SwapADFForETH',
    inputs: [
      { name: 'seller', type: 'address', indexed: true },
      { name: 'adfIn', type: 'uint256', indexed: false },
      { name: 'ethOut', type: 'uint256', indexed: false },
      { name: 'feeCollected', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'LiquidityAdded',
    inputs: [
      { name: 'provider', type: 'address', indexed: true },
      { name: 'ethAmount', type: 'uint256', indexed: false },
      { name: 'adfAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'reserveETH',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reserveADF',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAmountOut',
    inputs: [
      { name: 'amountIn', type: 'uint256' },
      { name: 'isETHForADF', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;
