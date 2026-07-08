import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { formatUnits } from 'viem';
import { NFTDetailPreview } from '../common/NFTDetailPreview';
import { CONTRACT_ADDRESSES, API_URL } from '../../config/contracts';
import { resolveIPFS } from '../../hooks/useNFTImage';
import { useConfirmDelivery, useOpenDispute, useTriggerGameTheoryBurn } from '../../hooks/useContractActions';
import styles from '../../pages/Dispute.module.css';

import {
  MessageSquare,
  Send,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  User,
  Shield,
  Check,
  X
} from 'lucide-react';

interface GameTheoryEscrowProps {
  auction: any;
  userAddress: string;
  onRefresh: () => void;
}

const GameTheoryEscrow: React.FC<GameTheoryEscrowProps> = ({ auction, userAddress, onRefresh }) => {
  // On-chain Write Hooks
  const {
    confirmDelivery,
    isPending: isPendingConfirm,
    isConfirming: isConfirmingConfirm,
    isConfirmed: isConfirmedConfirm,
    error: confirmError
  } = useConfirmDelivery();

  const {
    openDispute,
    isPending: isPendingDispute,
    isConfirming: isConfirmingDispute,
    isConfirmed: isConfirmedDispute,
    error: disputeError
  } = useOpenDispute();

  const {
    triggerGameTheoryBurn,
    isPending: isPendingBurn,
    isConfirming: isConfirmingBurn,
    isConfirmed: isConfirmedBurn,
    error: burnError
  } = useTriggerGameTheoryBurn();

  // WebSocket Chat States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string; isSystem?: boolean }[]>([]);
  const [myMessage, setMyMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const messagesListRef = useRef<HTMLDivElement>(null);

  // Connect private escrow chat room
  useEffect(() => {
    if (!auction || !userAddress) return;

    const socketUrl = API_URL.replace('/api', '') || 'http://localhost:4000';
    const socketHost = socketUrl.includes('localhost') ? 'http://localhost:4000' : socketUrl;

    const newSocket = io(socketHost);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      newSocket.emit('joinEscrow', {
        auctionId: auction.auction_id,
        walletAddress: userAddress
      });
    });

    newSocket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    newSocket.on('message', (msgData: any) => {
      const date = new Date(msgData.timestamp);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // Auto refresh if a system event occurs
      if (msgData.sender === 'Hệ thống' && msgData.message.includes('HỆ THỐNG:')) {
        onRefresh();
      }

      setChatMessages(prev => [
        ...prev,
        {
          user: msgData.sender === 'Hệ thống'
            ? 'Hệ thống'
            : msgData.sender.toLowerCase() === userAddress.toLowerCase()
              ? 'Bạn'
              : `${msgData.sender.slice(0, 6)}...${msgData.sender.slice(-4)}`,
          text: msgData.message,
          time: timeStr,
          isSystem: msgData.isSystem
        }
      ]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [auction?.auction_id, userAddress]);

  // Trigger onRefresh and emit socket message when transactions are confirmed on-chain
  useEffect(() => {
    if (isConfirmedConfirm) {
      if (socket) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Người mua (${userAddress.slice(0, 6)}...) đã ký xác nhận bàn giao hàng thành công trên blockchain!`,
          sender: 'Hệ thống'
        });
      }
      onRefresh();
    }
  }, [isConfirmedConfirm]);

  useEffect(() => {
    if (isConfirmedDispute) {
      if (socket) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Một bên đã nhấn Bàn giao thất bại! Tiền ký quỹ cọc của cả 2 bên và tiền thầu tạm thời bị khóa. Cần kích hoạt Đốt cọc & Hoàn NFT để giải phóng phiên đấu giá!`,
          sender: 'Hệ thống'
        });
      }
      onRefresh();
    }
  }, [isConfirmedDispute]);

  useEffect(() => {
    if (isConfirmedBurn) {
      if (socket) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Cơ chế tự hủy đã kích hoạt! Toàn bộ số tiền cọc và tiền thầu đã bị ĐỐT sạch trên blockchain. NFT đã được trả lại cho Người bán.`,
          sender: 'Hệ thống'
        });
      }
      onRefresh();
    }
  }, [isConfirmedBurn]);

  // Scroll to chat bottom inside the container (prevents window scrolling)
  useEffect(() => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMessage.trim() || !socket || !auction || !userAddress) return;
    socket.emit('sendEscrowMessage', {
      auctionId: auction.auction_id,
      message: myMessage,
      sender: userAddress.toLowerCase()
    });
    setMyMessage('');
  };

  const handleConfirmDelivery = () => {
    if (!auction || isPendingConfirm || isConfirmingConfirm) return;
    confirmDelivery(BigInt(auction.auction_id));
  };

  const handleOpenDispute = () => {
    if (!auction || isPendingDispute || isConfirmingDispute) return;
    openDispute(BigInt(auction.auction_id), "Game Theory Escrow Delivery Failed");
  };

  const handleTriggerGameTheoryBurn = () => {
    if (!auction || !auction.dispute_id || isPendingBurn || isConfirmingBurn) return;
    triggerGameTheoryBurn(BigInt(auction.dispute_id));
  };

  const reservePrice = parseFloat(formatUnits(BigInt(auction.reserve_price), 18));
  const topBid = parseFloat(formatUnits(BigInt(auction.current_top_bid || '0'), 18));

  const isSeller = auction.seller.toLowerCase() === userAddress.toLowerCase();
  const isWinner = auction.current_top_bidder && auction.current_top_bidder.toLowerCase() === userAddress.toLowerCase();
  const phase = auction.phase; // 'ESCROW_HOLDING', 'DISPUTE_OPENED', 'RESOLVED'

  return (
    <div className={styles.detailGrid}>

      {/* Left Sub-column: NFT Preview & Specs */}
      <div className={styles.leftSubCol}>
        {/* NFTDetailPreview */}
        <div className={`glass-panel ${styles.previewWrapper}`}>
          <NFTDetailPreview
            nft={{
              token_id: auction.nft_token_id,
              owner: phase === 'RESOLVED' ? auction.current_top_bidder : auction.seller,
              name: auction.name || `Vật phẩm #${auction.nft_token_id}`,
              image: auction.image || '',
              token_uri: auction.token_uri || '',
              description: auction.description || '',
              images: auction.images || []
            }}
          />
        </div>

        {/* On-Chain specs */}
        <div className={`glass-panel ${styles.technicalCard}`}>
          <h4 className={styles.technicalTitle}>Thông tin kỹ thuật</h4>

          <div className={styles.technicalGrid}>
            <div className={styles.technicalItem}>
              <span className={styles.technicalLabel}>Nhãn thuộc tính</span>
              <div className={styles.badgeRow}>
                <span className={styles.categoryBadge}>{auction.category_name || 'NFT'}</span>
                <span className={styles.deliveryBadge}>Vật lý</span>
              </div>
            </div>

            <div className={styles.technicalItem}>
              <span className={styles.technicalLabel}>Phương pháp bảo vệ</span>
              <span className={styles.technicalValue}>Ký quỹ lý thuyết trò chơi</span>
            </div>

            {auction.location_province && (
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Nơi bàn giao</span>
                <span className={styles.technicalValue}>
                  {auction.location_detail ? `${auction.location_detail}, ` : ''}
                  {auction.location_province}
                </span>
              </div>
            )}

            <div className={styles.technicalItem}>
              <span className={styles.technicalLabel}>Hợp đồng Escrow</span>
              <span className={`${styles.technicalValue} ${styles.valueMono}`}>
                {CONTRACT_ADDRESSES.AuctionExchange.slice(0, 8)}...{CONTRACT_ADDRESSES.AuctionExchange.slice(-6)}
              </span>
            </div>

            <div className={styles.technicalItem}>
              <span className={styles.technicalLabel}>Token ID</span>
              <span className={`${styles.technicalValue} ${styles.valueMono}`}>{auction.nft_token_id}</span>
            </div>

            {auction.token_uri && (
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Xem IPFS Metadata</span>
                <a
                  href={resolveIPFS(auction.token_uri)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.technicalValue} ${styles.valueLink} ${styles.valueMono}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Xem file</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Sub-column: Confirmation card, Stake Status, & Chat 1-1 */}
      <div className={styles.rightSubCol}>

        {/* CONFIRMATION CARD */}
        <div className={`glass-panel ${styles.confirmCard}`}>
          <h4 className={styles.confirmTitle}>Xác nhận bàn giao tài sản</h4>

          <div className={styles.userRoleInfo}>
            Vai trò của bạn: <strong>
              {isSeller ? 'Người bán (Seller)' : isWinner ? 'Người mua thắng thầu (Buyer)' : 'Khách vãng lai'}
            </strong>
          </div>

          <p className={styles.confirmDesc}>
            Theo cơ chế <strong>Lý thuyết trò chơi</strong>, người bán đã cọc cấn trừ bằng giá khởi điểm. 
            Nếu hai bên xác nhận giao dịch thành công, tiền bid sẽ chuyển cho người bán và tiền cọc được trả lại cho cả hai bên. 
            Nếu một trong 2 bên ấn từ chối bàn giao, toàn bộ tiền cọc của cả 2 bên cùng tiền thầu sẽ bị đốt bỏ hoàn toàn trên blockchain.
          </p>

          {phase === 'ESCROW_HOLDING' ? (
            <div>
              <div className={styles.confirmBtnRow}>
                {isWinner ? (
                  <button 
                    className={styles.confirmBtnRelease}
                    onClick={handleConfirmDelivery}
                    disabled={isPendingConfirm || isConfirmingConfirm}
                  >
                    <ShieldCheck size={16} />
                    <span>
                      {isPendingConfirm || isConfirmingConfirm ? 'Đang giao dịch...' : 'Xác nhận thành công'}
                    </span>
                  </button>
                ) : (
                  <button 
                    className={styles.confirmBtnRelease}
                    disabled
                    style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    title="Chỉ người mua thắng thầu mới có quyền giải phóng tiền cọc"
                  >
                    <ShieldCheck size={16} />
                    <span>Chờ Buyer xác nhận...</span>
                  </button>
                )}

                <button 
                  className={styles.confirmBtnDispute}
                  onClick={handleOpenDispute}
                  disabled={isPendingDispute || isConfirmingDispute}
                >
                  <ShieldAlert size={16} />
                  <span>
                    {isPendingDispute || isConfirmingDispute ? 'Đang giao dịch...' : 'Bàn giao thất bại'}
                  </span>
                </button>
              </div>

              {confirmError && (
                <p className={`${styles.participantStatusText} ${styles.statusRed}`} style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                  Lỗi xác nhận: {confirmError.message.includes('User rejected') ? 'Người dùng từ chối giao dịch' : confirmError.message.slice(0, 100)}
                </p>
              )}
              {disputeError && (
                <p className={`${styles.participantStatusText} ${styles.statusRed}`} style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                  Lỗi bàn giao: {disputeError.message.includes('User rejected') ? 'Người dùng từ chối giao dịch' : disputeError.message.slice(0, 100)}
                </p>
              )}
            </div>
          ) : phase === 'DISPUTE_OPENED' ? (
            <div className={`${styles.confirmState} ${styles.confirmStateDisputed}`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                <AlertTriangle size={16} />
                <span>🔥 Đang trong trạng thái Bàn giao thất bại!</span>
              </div>
              <p style={{ margin: '0 0 16px 0', fontWeight: 'normal', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Hành vi bàn giao thất bại đã được ghi nhận (Mã tranh chấp: #{auction.dispute_id}). 
                Cọc và tiền bid hiện đang bị khóa tạm thời. Một trong 2 bên (Buyer/Seller) cần ký giao dịch kích hoạt cơ chế Đốt cọc & Hoàn trả để giải phóng phiên đấu giá này trên blockchain.
              </p>

              {(isSeller || isWinner) && (
                <button
                  className="btn btn-error btn-sm"
                  style={{ width: '100%', gap: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', padding: '10px 0' }}
                  onClick={handleTriggerGameTheoryBurn}
                  disabled={isPendingBurn || isConfirmingBurn}
                >
                  <ShieldAlert size={16} />
                  <span>
                    {isPendingBurn || isConfirmingBurn ? 'Đang thực thi giao dịch...' : 'Kích hoạt Đốt cọc & Hoàn NFT về Seller'}
                  </span>
                </button>
              )}

              {burnError && (
                <p className={`${styles.participantStatusText} ${styles.statusRed}`} style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                  Lỗi kích hoạt: {burnError.message.includes('User rejected') ? 'Người dùng từ chối giao dịch' : burnError.message.slice(0, 100)}
                </p>
              )}
            </div>
          ) : (
            // phase === 'RESOLVED'
            auction.dispute_id ? (
              <div className={`${styles.confirmState} ${styles.confirmStateDisputed}`}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                  <AlertTriangle size={16} />
                  <span>🔥 Giao dịch đã thất bại!</span>
                </div>
                <p style={{ margin: '0', fontWeight: 'normal', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Hệ thống tự hủy đã thực thi. Toàn bộ tiền cọc ký quỹ của 2 bên và tiền thầu đã bị ĐỐT sạch. NFT đã được hoàn trả lại cho Người bán.
                </p>
              </div>
            ) : (
              <div className={styles.confirmState}>
                🎉 Giao dịch đã hoàn tất thành công!
                <p style={{ margin: '4px 0 0 0', fontWeight: 'normal', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Tiền thầu đã chuyển cho Người bán. Tiền ký quỹ cọc của cả hai bên đã được giải phóng (Pending Returns).
                </p>
              </div>
            )
          )}
        </div>

        {/* PARTICIPANTS BRIDGE CARD */}
        <div className={`glass-panel ${styles.participantsCard}`}>
          <h4 className={styles.confirmTitle}>Trạng thái Ký quỹ 2 đầu</h4>
          <div className={styles.participantsRow}>
            {/* SELLER COLUMN */}
            <div className={`${styles.participantCol} ${isSeller ? styles.participantColActive : ''}`}>
              <div className={styles.participantLabel}>
                <User size={14} className="text-gold" />
                <span>Bên bán (Seller)</span>
              </div>
              <div className={styles.participantAddress} title={auction.seller}>
                {auction.seller.slice(0, 8)}...{auction.seller.slice(-6)}
              </div>

              <div className={styles.stakeInfo}>
                <div className={styles.stakeItem}>
                  <span className={styles.stakeLabel}>Tiền cọc ký quỹ:</span>
                  <span className={`${styles.stakeValue} ${styles.stakeValueHighlight}`}>
                    {reservePrice.toFixed(2)} ADF
                  </span>
                </div>

                <div className={styles.stakeItem}>
                  <span className={styles.stakeLabel}>Trạng thái:</span>
                  {phase === 'RESOLVED' ? (
                    <span className={`${styles.participantStatusText} ${
                      auction.dispute_id ? styles.statusRed : styles.statusGreen
                    }`}>
                      {auction.dispute_id ? <X size={12} /> : <Check size={12} />}
                      <span>{auction.dispute_id ? 'Bị đốt (Burned)' : 'Đã giải phóng'}</span>
                    </span>
                  ) : phase === 'DISPUTE_OPENED' ? (
                    <span className={`${styles.participantStatusText} ${styles.statusRed}`}>
                      <X size={12} />
                      <span>Chờ đốt cọc</span>
                    </span>
                  ) : (
                    <span className={`${styles.participantStatusText} ${styles.statusGreen}`}>
                      <Shield size={12} />
                      <span>Đã khóa cọc</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* BUYER COLUMN */}
            <div className={`${styles.participantCol} ${isWinner ? styles.participantColActive : ''}`}>
              <div className={styles.participantLabel}>
                <User size={14} style={{ color: '#00e3fd' }} />
                <span>Bên mua (Buyer)</span>
              </div>
              <div className={styles.participantAddress} title={auction.current_top_bidder}>
                {auction.current_top_bidder
                  ? `${auction.current_top_bidder.slice(0, 8)}...${auction.current_top_bidder.slice(-6)}`
                  : 'Chưa có người mua'
                }
              </div>

              <div className={styles.stakeInfo}>
                <div className={styles.stakeItem}>
                  <span className={styles.stakeLabel}>Tiền cọc ký quỹ:</span>
                  <span className={`${styles.stakeValue} ${styles.stakeValueHighlight}`}>
                    {reservePrice.toFixed(2)} ADF
                  </span>
                </div>
                <div className={styles.stakeItem}>
                  <span className={styles.stakeLabel}>Tiền đấu giá:</span>
                  <span className={styles.stakeValue}>
                    {topBid.toFixed(2)} ADF
                  </span>
                </div>

                <div className={styles.stakeItem}>
                  <span className={styles.stakeLabel}>Trạng thái:</span>
                  {phase === 'RESOLVED' ? (
                    <span className={`${styles.participantStatusText} ${
                      auction.dispute_id ? styles.statusRed : styles.statusGreen
                    }`}>
                      {auction.dispute_id ? <X size={12} /> : <Check size={12} />}
                      <span>{auction.dispute_id ? 'Bị đốt (Burned)' : 'Đã giải phóng'}</span>
                    </span>
                  ) : phase === 'DISPUTE_OPENED' ? (
                    <span className={`${styles.participantStatusText} ${styles.statusRed}`}>
                      <X size={12} />
                      <span>Chờ đốt cọc + thầu</span>
                    </span>
                  ) : (
                    <span className={`${styles.participantStatusText} ${styles.statusGreen}`}>
                      <Shield size={12} />
                      <span>Đã khóa cọc + thầu</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 1-on-1 PRIVATE CHAT */}
        <div className={`glass-panel ${styles.chatBox}`}>
          <div className={styles.chatHeader}>
            <div className={styles.chatTitleContainer}>
              <MessageSquare size={16} />
              <h3 className={styles.chatTitle}>Kênh Thảo Luận 1-1</h3>
            </div>
            <span className={styles.chatStatus}>
              ● {isSocketConnected ? 'Kênh bảo mật đã kết nối' : 'Mất kết nối'}
            </span>
          </div>

          {/* Message list */}
          <div ref={messagesListRef} className={styles.messagesList}>
            {chatMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Chưa có tin nhắn nào. Người mua và Người bán có thể thương lượng trực tiếp tại đây về tình trạng bàn giao.
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`${styles.messageItem} ${msg.isSystem ? styles.messageSystem : ''}`}
                >
                  <div className={styles.messageMeta}>
                    <span
                      className={`${styles.messageSender} ${msg.isSystem ? styles.senderSystem : msg.user === 'Bạn' ? styles.senderMe : ''
                        }`}
                    >
                      {msg.user}
                    </span>
                    <span className={styles.messageTime}>{msg.time}</span>
                  </div>
                  <div className={styles.messageText}>{msg.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Chat form */}
          <form onSubmit={handleSendChat} className={styles.chatInputForm}>
            <input
              type="text"
              className={styles.chatInput}
              value={myMessage}
              onChange={(e) => setMyMessage(e.target.value)}
              placeholder="Nhập tin nhắn đàm phán..."
              disabled={!isSocketConnected}
            />
            <button
              type="submit"
              className="btn btn-outline btn-sm"
              disabled={!isSocketConnected || !myMessage.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '30px', padding: '0 16px' }}
            >
              <span>Gửi</span>
              <Send size={12} />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};

export default GameTheoryEscrow;
