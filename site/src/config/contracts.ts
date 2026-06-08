/**
 * Contract Constants — ABI + Addresses cho 3 smart contracts
 * 
 * ABI được giữ gọn: chỉ bao gồm các function/event mà frontend cần.
 * Địa chỉ đọc từ biến môi trường VITE_*
 */

import { type Address } from 'viem';

// ---- Addresses ----
export const CONTRACT_ADDRESSES = {
  ADF: (import.meta.env.VITE_ADF_ADDRESS || '0x') as Address,
  ADF_NFT: (import.meta.env.VITE_ADF_NFT_ADDRESS || '0x') as Address,
  AuctionExchange: (import.meta.env.VITE_AUCTION_EXCHANGE_ADDRESS || '0x') as Address,
};

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ---- ADF (ERC20) ABI ----
export const ADF_ABI = [
  {
    type: 'function',
    name: 'faucet',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'allowance',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

// ---- ADF_NFT (ERC721) ABI ----
export const ADF_NFT_ABI = [
  {
    type: 'function',
    name: 'mintNFT',
    inputs: [{ name: '_tokenURI', type: 'string' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'ownerOf',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'tokenURI',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getApproved',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'NFTMinted',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;

// ---- AuctionExchange ABI ----
export const AUCTION_EXCHANGE_ABI = [
  // Functions
  {
    type: 'function',
    name: 'createAuction',
    inputs: [
      { name: '_nftTokenId', type: 'uint256' },
      { name: '_duration', type: 'uint256' },
      { name: '_reservePrice', type: 'uint256' },
      { name: '_minBidIncrement', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'bid',
    inputs: [
      { name: '_auctionId', type: 'uint256' },
      { name: '_bidAmount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'endAuction',
    inputs: [{ name: '_auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelAuction',
    inputs: [{ name: '_auctionId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [],
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
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'pendingReturns',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
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
  {
    type: 'event',
    name: 'Withdraw',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;
