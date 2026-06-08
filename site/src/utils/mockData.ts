export interface Creator {
  address?: string;
  username: string;
  avatar?: string;
}

export interface NFTItem {
  id: string;
  title: string;
  creator: Creator;
  image: string;
  status: 'active' | 'upcoming' | 'ended';
  currentPrice: number;
  startPrice: number;
  endTime: number;
  startTime?: number;
  owner?: Creator;
}

export const mockNFTs: NFTItem[] = [
  {
    id: "1",
    title: "Vũ Trụ Vô Hạn #01",
    creator: {
      address: "0x1234567890abcdef1234567890abcdef12345678",
      username: "@CosmicCreator",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1644024276223-4411136b672e?w=500&auto=format&fit=crop&q=80",
    status: "active",
    currentPrice: 0.85,
    startPrice: 0.5,
    endTime: Date.now() + 3 * 3600 * 1000 + 12 * 60 * 1000, // +3h 12m
  },
  {
    id: "2",
    title: "Cyber Sài Gòn 3000",
    creator: {
      address: "0xabcdef1234567890abcdef1234567890abcdef12",
      username: "@SaigonPunk",
      avatar: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=80",
    status: "upcoming",
    currentPrice: 0,
    startPrice: 1.2,
    startTime: Date.now() + 12 * 3600 * 1000 + 45 * 60 * 1000, // +12h 45m
    endTime: Date.now() + 48 * 3600 * 1000,
  },
  {
    id: "3",
    title: "Giấc Mơ Neon",
    creator: {
      address: "0x9876543210fedcba9876543210fedcba98765432",
      username: "@DreamWeaver",
      avatar: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1618005198143-d366800e72dd?w=500&auto=format&fit=crop&q=80",
    status: "ended",
    currentPrice: 2.1,
    startPrice: 1.0,
    endTime: Date.now() - 24 * 3600 * 1000,
    owner: {
      username: "@crypto_king"
    }
  },
  {
    id: "4",
    title: "Mật Mã Tự Nhiên",
    creator: {
      address: "0x444455556666777788889999aaaabbbbccccdddd",
      username: "@BioArt",
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80",
    status: "active",
    currentPrice: 0.45,
    startPrice: 0.2,
    endTime: Date.now() + 1 * 3600 * 1000 + 45 * 60 * 1000,
  },
  {
    id: "5",
    title: "Sự Tĩnh Lặng Của Đá",
    creator: {
      address: "0x1111222233334444555566667777888899990000",
      username: "@ZenArtist",
      avatar: "https://images.unsplash.com/photo-1620121692029-d088224ddc74?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1617791160505-6f006e121980?w=500&auto=format&fit=crop&q=80",
    status: "active",
    currentPrice: 1.15,
    startPrice: 0.8,
    endTime: Date.now() + 8 * 3600 * 1000 + 19 * 60 * 1000,
  },
  {
    id: "6",
    title: "Ký Ức Thời Gian",
    creator: {
      address: "0xaaaabbbbccccddddeeeeffff0000111122223333",
      username: "@TimeTraveler",
      avatar: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=50&auto=format&fit=crop&q=80"
    },
    image: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=500&auto=format&fit=crop&q=80",
    status: "ended",
    currentPrice: 0.95,
    startPrice: 0.5,
    endTime: Date.now() - 48 * 3600 * 1000,
    owner: {
      username: "@whale_investor"
    }
  }
];

export interface HeroFeatured {
  title: string;
  description: string;
  startPrice: number;
  endTime: number;
  creator: Creator;
  image: string;
}

export const heroFeaturedMock: HeroFeatured = {
  title: "Đại Lộ Tương Lai #09",
  description: "Bộ sưu tập nghệ thuật kỹ thuật số độc bản được đúc trực tiếp bởi nghệ sĩ trẻ. Trải nghiệm không gian ảo đa chiều cùng các đặc quyền độc quyền dành riêng cho người sở hữu.",
  startPrice: 1.5,
  endTime: Date.now() + 2 * 3600 * 1000 + 14 * 60 * 1000 + 45 * 1000, // 02:14:45
  creator: {
    username: "@CryptoArtist"
  },
  image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80"
};

export interface HeroTrending {
  title: string;
  creator: Creator;
  currentPrice: number;
  endTime: number;
  image: string;
}

export const heroTrendingMock: HeroTrending = {
  title: "Hồn Việt Trong Kỹ Thuật Số",
  creator: {
    username: "@MinhAnh_Art",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=50&auto=format&fit=crop&q=80"
  },
  currentPrice: 2.8,
  endTime: Date.now() + 4 * 3600 * 1000 + 15 * 60 * 1000, // 4h 15m
  image: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=500&auto=format&fit=crop&q=80"
};
