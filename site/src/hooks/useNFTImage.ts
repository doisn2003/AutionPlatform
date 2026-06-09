import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';
import { ADF_NFT_ABI, CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * Phân giải đường dẫn IPFS sang HTTP gateway.
 * Mặc định sử dụng Pinata Gateway, có thể fallback sang ipfs.io và cloudflare-ipfs.
 */
export const resolveIPFS = (url?: string, gatewayIndex = 0): string => {
  if (!url) return '';
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    const gateways = [
      'https://gateway.pinata.cloud/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/'
    ];
    // Giới hạn index trong khoảng hợp lệ
    const selectedGateway = gateways[gatewayIndex % gateways.length];
    return `${selectedGateway}${cid}`;
  }
  return url;
};

/**
 * Hook đọc tokenURI trực tiếp từ contract ADF_NFT.
 */
export function useNFTTokenURI(tokenId?: bigint) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.ADF_NFT,
    abi: ADF_NFT_ABI,
    functionName: 'tokenURI',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined,
      staleTime: 1000 * 60 * 30, // Metadata URI của NFT là tĩnh, cache 30 phút
    },
  });
}

/**
 * Hook hợp nhất: Ưu tiên tải ảnh từ IPFS on-chain, dự phòng là ảnh từ Supabase (DB).
 */
export function useNFTImage(tokenId?: number, supabaseImage?: string) {
  const { data: tokenURI, isLoading: isTokenURILoading } = useNFTTokenURI(
    tokenId !== undefined ? BigInt(tokenId) : undefined
  );

  const { data: onChainImageUrl, isLoading: isMetadataLoading, isError } = useQuery({
    queryKey: ['nft-image', tokenId, tokenURI],
    queryFn: async () => {
      if (!tokenURI) return null;
      
      // Thử tải metadata qua các gateway khác nhau nếu gặp lỗi
      let metadata: any = null;
      let lastError: any = null;
      
      for (let i = 0; i < 3; i++) {
        try {
          const url = resolveIPFS(tokenURI, i);
          const res = await fetch(url);
          if (res.ok) {
            metadata = await res.json();
            break;
          }
          throw new Error(`HTTP error! status: ${res.status}`);
        } catch (err) {
          lastError = err;
          // Tiếp tục thử gateway tiếp theo
        }
      }

      if (!metadata) {
        throw lastError || new Error('Failed to fetch metadata from all gateways');
      }

      const imageUrl = metadata.image || null;
      if (imageUrl && imageUrl.startsWith('ipfs://')) {
        // Trả về URI IPFS thô, việc phân giải gateway hiển thị sẽ do resolveIPFS thực hiện
        return imageUrl;
      }
      return imageUrl;
    },
    enabled: !!tokenURI,
    staleTime: 1000 * 60 * 10, // Cache metadata 10 phút
    retry: 1, // Hạn chế retry để phản hồi nhanh
  });

  // Hợp nhất kết quả:
  // 1. Nếu có ảnh lấy từ IPFS on-chain (thành công), ưu tiên hiển thị ảnh đó.
  // 2. Dự phòng: nếu on-chain bị lỗi, chưa có tokenURI hoặc không lấy được ảnh, sử dụng ảnh từ Supabase (DB).
  // 3. Nếu cả hai đều không có, trả về chuỗi rỗng.
  const rawImage = onChainImageUrl || supabaseImage || '';
  const imageUrl = resolveIPFS(rawImage);
  const isLoading = (isTokenURILoading || isMetadataLoading) && !onChainImageUrl && !supabaseImage;

  return {
    imageUrl,
    isLoading,
    isError: isError && !supabaseImage,
  };
}
