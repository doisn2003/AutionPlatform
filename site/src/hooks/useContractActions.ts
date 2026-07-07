//@ts-nocheck
/**
 * Custom Hooks — On-chain Write Actions
 * 
 * Wraps Wagmi useWriteContract for each smart contract interaction.
 * Mỗi hook trả về { write, isPending, isSuccess, error, data (txHash) }
 */

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ADF_ABI, ADF_NFT_ABI, AUCTION_EXCHANGE_ABI, CONTRACT_ADDRESSES, ADF_POOL_ABI, DISPUTE_RESOLUTION_ABI } from '../config/contracts';

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

/** Gọi ADF.approve(spender, amount) — Unlimited approval cho sàn hoặc chỉ định số lượng */
export function useApproveADF() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const approve = (spender?: `0x${string}`, amount?: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF,
      abi: ADF_ABI,
      functionName: 'approve',
      args: [spender || CONTRACT_ADDRESSES.AuctionExchange, amount !== undefined ? amount : maxUint256],
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

/** Gọi ADF_NFT.burn(tokenId) — Đốt (hủy vĩnh viễn) một NFT */
export function useBurnNFT() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const burn = (tokenId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF_NFT,
      abi: ADF_NFT_ABI,
      functionName: 'burn',
      args: [tokenId],
    });
  };

  return { burn, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
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

// ---- ADF_Pool Actions ----

/** Gọi ADF_Pool.swapETHForADF(minADFOut) */
export function useSwapETHForADF() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const swapETHForADF = (minADFOut: bigint, value: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF_Pool,
      abi: ADF_POOL_ABI,
      functionName: 'swapETHForADF',
      args: [minADFOut],
      value,
    });
  };

  return { swapETHForADF, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi ADF_Pool.swapADFForETH(adfAmount, minETHOut) */
export function useSwapADFForETH() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const swapADFForETH = (adfAmount: bigint, minETHOut: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF_Pool,
      abi: ADF_POOL_ABI,
      functionName: 'swapADFForETH',
      args: [adfAmount, minETHOut],
    });
  };

  return { swapADFForETH, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi ADF.transfer(to, amount) — Chuyển khoản token ADF */
export function useTransferADF() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const transferADF = (to: `0x${string}`, amount: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.ADF,
      abi: ADF_ABI,
      functionName: 'transfer',
      args: [to, amount],
    });
  };

  return { transferADF, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi AuctionExchange.confirmDelivery(auctionId) — Xác nhận nhận hàng thành công */
export function useConfirmDelivery() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const confirmDelivery = (auctionId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'confirmDelivery',
      args: [auctionId],
    });
  };

  return { confirmDelivery, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi AuctionExchange.openDispute(auctionId, evidenceIPFS) — Mở tranh chấp */
export function useOpenDispute() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const openDispute = (auctionId: bigint, evidenceIPFS: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.AuctionExchange,
      abi: AUCTION_EXCHANGE_ABI,
      functionName: 'openDispute',
      args: [auctionId, evidenceIPFS],
    });
  };

  return { openDispute, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.triggerGameTheoryBurn(disputeId) — Đốt cọc của Lý thuyết trò chơi */
export function useTriggerGameTheoryBurn() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const triggerGameTheoryBurn = (disputeId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'triggerGameTheoryBurn',
      args: [disputeId],
    });
  };

  return { triggerGameTheoryBurn, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.stakeForJuror(amount) */
export function useStakeForJuror() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const stakeForJuror = (amount: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'stakeForJuror',
      args: [amount],
    });
  };

  return { stakeForJuror, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.unstakeJuror(amount) */
export function useUnstakeJuror() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const unstakeJuror = (amount: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'unstakeJuror',
      args: [amount],
    });
  };

  return { unstakeJuror, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.commitVote(disputeId, commitHash) */
export function useCommitVote() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const commitVote = (disputeId: bigint, commitHash: `0x${string}`) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'commitVote',
      args: [disputeId, commitHash],
    });
  };

  return { commitVote, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.revealVote(disputeId, vote, salt) */
export function useRevealVote() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const revealVote = (disputeId: bigint, vote: number, salt: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'revealVote',
      args: [disputeId, vote, salt],
    });
  };

  return { revealVote, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.resolveDispute(disputeId) */
export function useResolveDispute() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const resolveDispute = (disputeId: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'resolveDispute',
      args: [disputeId],
    });
  };

  return { resolveDispute, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

/** Gọi DisputeResolution.submitEvidence(disputeId, evidenceIPFS) */
export function useSubmitEvidence() {
  const { writeContract, data: hash, isPending, isSuccess, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const submitEvidence = (disputeId: bigint, evidenceIPFS: string) => {
    writeContract({
      address: CONTRACT_ADDRESSES.DisputeResolution,
      abi: DISPUTE_RESOLUTION_ABI,
      functionName: 'submitEvidence',
      args: [disputeId, evidenceIPFS],
    });
  };

  return { submitEvidence, hash, isPending, isConfirming, isConfirmed, isSuccess, error };
}

