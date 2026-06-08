/**
 * useAuctions Hook — Fetch dữ liệu đấu giá từ server API
 */

import { useQuery } from '@tanstack/react-query';
import { API_URL } from '../config/contracts';

export interface AuctionFromAPI {
  id: number;
  auction_id: number;
  seller: string;
  nft_token_id: number;
  end_time: string;
  reserve_price: string;
  min_bid_increment: string;
  current_top_bidder: string | null;
  current_top_bid: string;
  active: boolean;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
}

interface AuctionAPIResponse {
  status: string;
  count: number;
  data: AuctionFromAPI[];
}

interface BidFromAPI {
  id: number;
  auction_id: number;
  bidder: string;
  amount: string;
  tx_hash: string | null;
  block_number: number | null;
  created_at: string;
}

interface BidsAPIResponse {
  status: string;
  count: number;
  data: BidFromAPI[];
}

/** Lấy danh sách phiên đấu giá */
export function useAuctions(status: 'all' | 'active' | 'ended' = 'all') {
  return useQuery<AuctionFromAPI[]>({
    queryKey: ['auctions', status],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/auctions?status=${status}`);
      if (!res.ok) throw new Error('Failed to fetch auctions');
      const json: AuctionAPIResponse = await res.json();
      return json.data;
    },
    refetchInterval: 5_000, // Refresh mỗi 5s
  });
}

/** Lấy chi tiết 1 phiên */
export function useAuctionDetail(auctionId: number) {
  return useQuery<AuctionFromAPI>({
    queryKey: ['auction', auctionId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/auctions/${auctionId}`);
      if (!res.ok) throw new Error('Failed to fetch auction');
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 5_000,
  });
}

/** Lấy lịch sử bid của 1 phiên */
export function useAuctionBids(auctionId: number) {
  return useQuery<BidFromAPI[]>({
    queryKey: ['bids', auctionId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/auctions/${auctionId}/bids`);
      if (!res.ok) throw new Error('Failed to fetch bids');
      const json: BidsAPIResponse = await res.json();
      return json.data;
    },
    refetchInterval: 5_000,
  });
}
