import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const initSocket = (server: any) => {
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance.on('connection', (socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);

    socket.on('joinAuction', ({ auctionId, walletAddress }) => {
      const room = `auction_${auctionId}`;
      socket.join(room);
      console.log(`👤 Wallet ${walletAddress} joined room ${room}`);
      
      // Gửi thông báo hệ thống người dùng tham gia
      ioInstance?.to(room).emit('message', {
        sender: 'Hệ thống',
        message: `Địa chỉ ví ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} đã tham gia phòng đấu giá.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      });
    });

    socket.on('sendMessage', ({ auctionId, message, sender }) => {
      const room = `auction_${auctionId}`;
      ioInstance?.to(room).emit('message', {
        sender,
        message,
        timestamp: new Date().toISOString(),
        isSystem: false
      });
    });

    socket.on('joinEscrow', ({ auctionId, walletAddress }) => {
      const room = `escrow_${auctionId}`;
      socket.join(room);
      console.log(`🔒 Wallet ${walletAddress} joined escrow room ${room}`);
      
      ioInstance?.to(room).emit('message', {
        sender: 'Hệ thống',
        message: `Kênh đàm phán 1-1 cho phiên #${auctionId} đã kết nối thành công.`,
        timestamp: new Date().toISOString(),
        isSystem: true
      });
    });

    socket.on('sendEscrowMessage', ({ auctionId, message, sender }) => {
      const room = `escrow_${auctionId}`;
      ioInstance?.to(room).emit('message', {
        sender,
        message,
        timestamp: new Date().toISOString(),
        isSystem: false
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
};

export const getIO = () => {
  return ioInstance;
};

export const broadcastToAuction = (auctionId: number, message: string) => {
  if (ioInstance) {
    const room = `auction_${auctionId}`;
    ioInstance.to(room).emit('message', {
      sender: 'Hệ thống',
      message,
      timestamp: new Date().toISOString(),
      isSystem: true
    });
  }
};
