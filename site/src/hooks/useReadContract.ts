/**
 * Custom Hooks — On-chain Read Operations
 * 
 * Wraps Wagmi useReadContract for reading blockchain state.
 */

import { useReadContract } from 'wagmi';
import { type Address } from 'viem';
import { ADF_ABI, ADF_NFT_ABI, AUCTION_EXCHANGE_ABI, CONTRACT_ADDRESSES, DISPUTE_RESOLUTION_ABI } from '../config/contracts';

/** Đọc ADF.balanceOf(address) — Số dư ADF của một địa chỉ */
export function useADFBalance(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.ADF,
    abi: ADF_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000, // Tự refresh mỗi 5s
    },
  });
}

/** Đọc ADF.allowance(owner, spender) — Số tiền sàn được phép tiêu */
export function useADFAllowance(owner?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.ADF,
    abi: ADF_ABI,
    functionName: 'allowance',
    args: owner ? [owner, CONTRACT_ADDRESSES.AuctionExchange] : undefined,
    query: {
      enabled: !!owner,
      refetchInterval: 10_000,
    },
  });
}

/** Đọc AuctionExchange.pendingReturns(address) — Tiền chờ rút */
export function usePendingReturns(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    functionName: 'pendingReturns',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
    },
  });
}

/** Đọc AuctionExchange.auctions(auctionId) — Chi tiết phiên on-chain */
export function useAuctionOnChain(auctionId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.AuctionExchange,
    abi: AUCTION_EXCHANGE_ABI,
    functionName: 'auctions',
    args: auctionId !== undefined ? [auctionId] : undefined,
    query: {
      enabled: auctionId !== undefined,
      refetchInterval: 5_000,
    },
  });
}

/** Đọc ADF_NFT.getApproved(tokenId) — Xem NFT đã được duyệt cho sàn chưa */
export function useNFTApproved(tokenId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.ADF_NFT,
    abi: ADF_NFT_ABI,
    functionName: 'getApproved',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
      refetchInterval: 5_000,
    },
  });
}

/** Đọc DisputeResolution.jurorStakes(address) — Số lượng ADF đã stake của một địa chỉ */
export function useJurorStakes(address?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.DisputeResolution,
    abi: DISPUTE_RESOLUTION_ABI,
    functionName: 'jurorStakes',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5_000,
    },
  });
}

/** Đọc ADF.allowance(owner, DisputeResolution) — Số ADF đã duyệt cho toà án */
export function useADFAllowanceForDispute(owner?: Address) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.ADF,
    abi: ADF_ABI,
    functionName: 'allowance',
    args: owner ? [owner, CONTRACT_ADDRESSES.DisputeResolution] : undefined,
    query: {
      enabled: !!owner,
      refetchInterval: 10_000,
    },
  });
}
