/**
 * Custom Hooks — On-chain Write Actions
 * 
 * Wraps Wagmi useWriteContract for each smart contract interaction.
 * Mỗi hook trả về { write, isPending, isSuccess, error, data (txHash) }
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADF_ABI, ADF_NFT_ABI, AUCTION_EXCHANGE_ABI, CONTRACT_ADDRESSES } from '../config/contracts';

// ---- ADF Token Actions ----

/** Gọi ADF.faucet() — Nhận 10 ADF miễn phí */
export function useFaucet() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const faucet = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF,
      abi: ADF_ABI,
      functionName: 'faucet',
    });
  };

  return { faucet, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi ADF.approve(spender, amount) — Unlimited approval cho sàn */
export function useApproveADF() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const approve = (spender?: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF,
      abi: ADF_ABI,
      functionName: 'approve',
      args: [spender || CONTRACT_ADDRESSES.AuctionExchange, maxUint256],
    });
  };

  return { approve, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

// ---- ADF_NFT Actions ----

/** Gọi ADF_NFT.mintNFT(tokenURI) */
export function useMintNFT() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const mint = (tokenURI: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF_NFT,
      abi: ADF_NFT_ABI,
      functionName: 'mintNFT',
      args: [tokenURI],
    });
  };

  return { mint, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi ADF_NFT.approve(exchange, tokenId) */
export function useApproveNFT() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const approveNFT = (tokenId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF_NFT,
      abi: ADF_NFT_ABI,
      functionName: 'approve',
      args: [CONTRACT_ADDRESSES.AuctionExchange, tokenId],
    });
  };

  return { approveNFT, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

// ---- AuctionExchange Actions ----

/** Gọi AuctionExchange.createAuction(tokenId, duration, reservePrice, minBidIncrement) */
export function useCreateAuction() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const createAuction = (
    tokenId: bigint,
    durationSeconds: bigint,
    reservePrice: bigint,
    minBidIncrement: bigint,
    assetType: number,
    disputeType: number,
    escrowDuration: bigint
  ) => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'createAuction',
      args: [tokenId, durationSeconds, reservePrice, minBidIncrement, assetType, disputeType, escrowDuration],
    });
  };

  return { createAuction, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi AuctionExchange.bid(auctionId, amount) */
export function useBid() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const bid = (auctionId: bigint, amount: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'bid',
      args: [auctionId, amount],
    });
  };

  return { bid, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi AuctionExchange.endAuction(auctionId) */
export function useEndAuction() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const endAuction = (auctionId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'endAuction',
      args: [auctionId],
    });
  };

  return { endAuction, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi AuctionExchange.withdraw() */
export function useWithdraw() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const withdraw = () => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'withdraw',
    });
  };

  return { withdraw, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}
