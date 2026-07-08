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
  ADF_Pool: (import.meta.env.VITE_ADF_POOL_ADDRESS || '0x') as Address,
  ADF_NFT: (import.meta.env.VITE_ADF_NFT_ADDRESS || '0x') as Address,
  AuctionExchange: (import.meta.env.VITE_AUCTION_EXCHANGE_ADDRESS || '0x') as Address,
  DisputeResolution: (import.meta.env.VITE_DISPUTE_RESOLUTION_ADDRESS || '0x') as Address,
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
  {
    type: 'function',
    name: 'burn',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

// ---- AuctionExchange ABI ----
export const AUCTION_EXCHANGE_ABI = [
  {"inputs":[{"internalType":"address","name":"_adfToken","type":"address"},{"internalType":"address","name":"_adfNFT","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"ReentrancyGuardReentrantCall","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"}],"name":"AuctionCanceled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"},{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"nftTokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"endTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reservePrice","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"minBidIncrement","type":"uint256"},{"indexed":false,"internalType":"uint8","name":"assetType","type":"uint8"},{"indexed":false,"internalType":"uint8","name":"disputeType","type":"uint8"},{"indexed":false,"internalType":"uint256","name":"escrowDuration","type":"uint256"}],"name":"AuctionCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"},{"indexed":true,"internalType":"address","name":"winner","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AuctionEnded","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"},{"indexed":true,"internalType":"address","name":"bidder","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"BidPlaced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"}],"name":"DeliveryConfirmed","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"},{"indexed":true,"internalType":"address","name":"initiator","type":"address"},{"indexed":false,"internalType":"string","name":"evidenceIPFS","type":"string"}],"name":"DisputeOpened","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"auctionId","type":"uint256"},{"indexed":false,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"deadline","type":"uint256"}],"name":"EscrowStarted","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[],"name":"adfNFT","outputs":[{"internalType":"contract IERC721","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"adfToken","outputs":[{"internalType":"contract IERC20","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"auctions","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"uint256","name":"nftTokenId","type":"uint256"},{"internalType":"uint256","name":"endTime","type":"uint256"},{"internalType":"uint256","name":"reservePrice","type":"uint256"},{"internalType":"uint256","name":"minBidIncrement","type":"uint256"},{"internalType":"address","name":"currentTopBidder","type":"address"},{"internalType":"uint256","name":"currentTopBid","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint8","name":"assetType","type":"uint8"},{"internalType":"uint8","name":"disputeType","type":"uint8"},{"internalType":"uint8","name":"phase","type":"uint8"},{"internalType":"uint256","name":"escrowDeadline","type":"uint256"},{"internalType":"uint256","name":"escrowDuration","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_auctionId","type":"uint256"},{"internalType":"uint256","name":"_bidAmount","type":"uint256"}],"name":"bid","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_auctionId","type":"uint256"}],"name":"cancelAuction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_auctionId","type":"uint256"}],"name":"confirmDelivery","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_nftTokenId","type":"uint256"},{"internalType":"uint256","name":"_duration","type":"uint256"},{"internalType":"uint256","name":"_reservePrice","type":"uint256"},{"internalType":"uint256","name":"_minBidIncrement","type":"uint256"},{"internalType":"uint8","name":"_assetType","type":"uint8"},{"internalType":"uint8","name":"_disputeType","type":"uint8"},{"internalType":"uint256","name":"_escrowDuration","type":"uint256"}],"name":"createAuction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_auctionId","type":"uint256"}],"name":"endAuction","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_auctionId","type":"uint256"},{"internalType":"string","name":"evidenceIPFS","type":"string"}],"name":"openDispute","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingReturns","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
] as const;

// ---- ADF_Pool (AMM) ABI ----
export const ADF_POOL_ABI = [
  {
    type: 'function',
    name: 'swapETHForADF',
    inputs: [{ name: 'minADFOut', type: 'uint256' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'swapADFForETH',
    inputs: [
      { name: 'adfAmount', type: 'uint256' },
      { name: 'minETHOut', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
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
] as const;

// ---- DisputeResolution ABI ----
export const DISPUTE_RESOLUTION_ABI = [
  {
    type: 'function',
    name: 'triggerGameTheoryBurn',
    inputs: [{ name: '_disputeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'stakeForJuror',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'unstakeJuror',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'jurorStakes',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'commitVote',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_commitHash', type: 'bytes32' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'revealVote',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_vote', type: 'uint8' },
      { name: '_salt', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'resolveDispute',
    inputs: [{ name: '_disputeId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitEvidence',
    inputs: [
      { name: '_disputeId', type: 'uint256' },
      { name: '_evidenceIPFS', type: 'string' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  }
] as const;
