import React, { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { formatUnits, keccak256, encodePacked } from 'viem';
import { NFTDetailPreview, type NFT } from '../common/NFTDetailPreview';
import { CONTRACT_ADDRESSES, API_URL } from '../../config/contracts';
import { resolveIPFS } from '../../hooks/useNFTImage';
import { useCommitVote, useRevealVote, useResolveDispute, useSubmitEvidence } from '../../hooks/useContractActions';
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
  X,
  Scale,
  Clock,
  Award,
  Info,
  FileText
} from 'lucide-react';

interface JuryVotingEscrowProps {
  auction: any;
  userAddress: string;
  onRefresh: () => void;
}

const JuryVotingEscrow: React.FC<JuryVotingEscrowProps> = ({ auction, userAddress, onRefresh }) => {
  // Dispute Details States
  const [dispute, setDispute] = useState<any>(null);
  const [votes, setVotes] = useState<any[]>([]);
  const [loadingDispute, setLoadingDispute] = useState(true);

  // Voting inputs/status
  const [selectedVote, setSelectedVote] = useState<number | null>(null); // 1 = Buyer, 2 = Seller
  const [revealVoteVal, setRevealVoteVal] = useState<number>(1);
  const [revealSaltVal, setRevealSaltVal] = useState<string>('');

  // Counter-evidence states
  const [showEvidenceForm, setShowEvidenceForm] = useState(false);
  const [evidenceDescInput, setEvidenceDescInput] = useState('');
  const [selectedEvidenceFiles, setSelectedEvidenceFiles] = useState<File[]>([]);
  const [evidencePreviewUrls, setEvidencePreviewUrls] = useState<string[]>([]);
  const [evidenceStep, setEvidenceStep] = useState<'idle' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [evidenceErrMsg, setEvidenceErrMsg] = useState('');

  const evidencePreviewUrlsRef = useRef(evidencePreviewUrls);
  useEffect(() => {
    evidencePreviewUrlsRef.current = evidencePreviewUrls;
  }, [evidencePreviewUrls]);

  // Enlarged image overlay
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Countdown Timer State
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!dispute || dispute.resolved) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      let deadlineStr = '';
      if (dispute.phase === 'EVIDENCE') {
        deadlineStr = dispute.evidence_deadline;
      } else if (dispute.phase === 'COMMIT') {
        deadlineStr = dispute.commit_deadline;
      } else if (dispute.phase === 'REVEAL') {
        deadlineStr = dispute.reveal_deadline;
      }

      if (!deadlineStr) {
        setTimeLeft('');
        return;
      }

      const diff = new Date(deadlineStr).getTime() - Date.now();
      // Thêm buffer 5 giây để tránh lệch múi giờ/clock drift giữa browser và blockchain block.timestamp
      if (diff <= 5000) {
        setTimeLeft('Đã hết hạn pha hiện tại. Chờ cập nhật trạng thái...');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Thời gian còn lại của pha: ${minutes} phút ${seconds} giây`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dispute]);

  // Contract Hooks
  const {
    submitEvidence,
    isPending: isPendingSubmitEv,
    isConfirming: isConfirmingSubmitEv,
    isConfirmed: isConfirmedSubmitEv,
    error: submitEvError
  } = useSubmitEvidence();

  const {
    commitVote,
    isPending: isPendingCommit,
    isConfirming: isConfirmingCommit,
    isConfirmed: isConfirmedCommit,
    error: commitError
  } = useCommitVote();

  const {
    revealVote,
    isPending: isPendingReveal,
    isConfirming: isConfirmingReveal,
    isConfirmed: isConfirmedReveal,
    error: revealError
  } = useRevealVote();

  const {
    resolveDispute,
    isPending: isPendingResolve,
    isConfirming: isConfirmingResolve,
    isConfirmed: isConfirmedResolve,
    error: resolveError
  } = useResolveDispute();

  // WebSocket Chat States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string; isSystem?: boolean }[]>([]);
  const [myMessage, setMyMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const messagesListRef = useRef<HTMLDivElement>(null);

  // Fetch dispute and vote details from REST API
  const fetchDisputeDetail = () => {
    if (!auction?.dispute_id) {
      setLoadingDispute(false);
      return;
    }
    fetch(`${API_URL}/api/disputes/${auction.dispute_id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setDispute(data.dispute);
          setVotes(data.votes);
        }
        setLoadingDispute(false);
      })
      .catch(err => {
        console.error("Failed to fetch dispute details:", err);
        setLoadingDispute(false);
      });
  };

  useEffect(() => {
    fetchDisputeDetail();
  }, [auction?.dispute_id]);

  // Connect private escrow/courtroom chat room
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

      // Refresh if a system notification occurs
      if (msgData.sender === 'Hệ thống' && msgData.message.includes('HỆ THỐNG:')) {
        fetchDisputeDetail();
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

  // Refresh data on transaction confirmation
  useEffect(() => {
    if (isConfirmedCommit) {
      if (socket && dispute) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Trọng tài (${userAddress.slice(0, 6)}...) đã gửi thành công Phiếu Bầu Kín (Commit Vote) lên Blockchain!`,
          sender: 'Hệ thống'
        });
      }
      fetchDisputeDetail();
      onRefresh();
    }
  }, [isConfirmedCommit]);

  useEffect(() => {
    if (isConfirmedReveal) {
      if (socket && dispute) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Trọng tài (${userAddress.slice(0, 6)}...) đã Giải Mã Phiếu Bầu (Reveal Vote) thành công trên Blockchain!`,
          sender: 'Hệ thống'
        });
      }
      fetchDisputeDetail();
      onRefresh();
    }
  }, [isConfirmedReveal]);

  useEffect(() => {
    if (isConfirmedResolve) {
      if (socket && dispute) {
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: Vụ án đã chính thức ĐÓNG & THI HÀNH ÁN trên blockchain! Thưởng phạt trọng tài đã được phân phối.`,
          sender: 'Hệ thống'
        });
      }
      fetchDisputeDetail();
      onRefresh();
    }
  }, [isConfirmedResolve]);

  // Handle write errors
  useEffect(() => {
    if (isConfirmedSubmitEv) {
      if (socket && dispute) {
        const roleName = userAddress.toLowerCase() === dispute.buyer.toLowerCase() ? 'Người mua (Buyer)' : 'Người bán (Seller)';
        socket.emit('sendEscrowMessage', {
          auctionId: auction.auction_id,
          message: `HỆ THỐNG: ${roleName} đã nộp thêm bằng chứng đối chất mới thành công lên Blockchain!`,
          sender: 'Hệ thống'
        });
      }
      alert("Nộp bằng chứng đối chất thành công!");
      setShowEvidenceForm(false);
      setEvidenceStep('idle');
      setEvidenceDescInput('');
      setSelectedEvidenceFiles([]);
      evidencePreviewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      setEvidencePreviewUrls([]);
      fetchDisputeDetail();
      onRefresh();
    }
  }, [isConfirmedSubmitEv]);

  useEffect(() => {
    if (submitEvError) {
      setEvidenceStep('error');
      setEvidenceErrMsg(submitEvError.message || 'Lỗi gửi giao dịch nộp bằng chứng.');
    }
  }, [submitEvError]);

  useEffect(() => {
    if (commitError) {
      alert(`Lỗi commit phiếu bầu: ${commitError.message || 'Giao dịch thất bại'}`);
    }
  }, [commitError]);

  useEffect(() => {
    if (revealError) {
      alert(`Lỗi giải mã phiếu bầu: ${revealError.message || 'Giao dịch thất bại'}`);
    }
  }, [revealError]);

  useEffect(() => {
    if (resolveError) {
      alert(`Lỗi đóng vụ án: ${resolveError.message || 'Giao dịch thất bại'}`);
    }
  }, [resolveError]);

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      setSelectedEvidenceFiles(prev => [...prev, ...filesArray]);
      
      const urls = filesArray.map(file => URL.createObjectURL(file));
      setEvidencePreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const removeEvidenceFile = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedEvidenceFiles(prev => prev.filter((_, i) => i !== index));
    setEvidencePreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceDescInput.trim()) {
      alert("Vui lòng nhập mô tả chi tiết bằng chứng.");
      return;
    }
    if (selectedEvidenceFiles.length === 0) {
      alert("Vui lòng chọn ít nhất một hình ảnh bằng chứng.");
      return;
    }

    try {
      setEvidenceStep('uploading');
      setEvidenceErrMsg('');

      // 1. Tải bằng chứng lên IPFS thông qua API backend
      const formData = new FormData();
      selectedEvidenceFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('description', evidenceDescInput);
      formData.append('auctionId', auction.auction_id.toString());
      formData.append('initiator', userAddress);

      const uploadRes = await fetch(`${API_URL}/api/disputes/evidence`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json();
        throw new Error(errData.error || 'Lỗi tải ảnh lên IPFS hoặc lưu cơ sở dữ liệu');
      }

      const uploadData = await uploadRes.json();
      const ipfsHash = uploadData.ipfsHash; // ipfs://QmMetadata...
      console.log("Uploaded metadata to IPFS success. Hash:", ipfsHash);

      // 2. Kích hoạt transaction submitEvidence on-chain
      setEvidenceStep('submitting');
      submitEvidence(BigInt(dispute.dispute_id), ipfsHash);
    } catch (err: any) {
      console.error(err);
      setEvidenceStep('error');
      setEvidenceErrMsg(err.message || 'Nộp bằng chứng thất bại.');
    }
  };

  // Scroll chat bottom
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

  // Perform Commit Vote (with LocalStorage helper)
  const handleCommitVote = () => {
    if (!dispute || !userAddress || selectedVote === null) return;
    
    // Generate salt and compute hash
    const salt = Math.random().toString(36).substring(2, 10);
    const commitHash = keccak256(encodePacked(['uint8', 'string'], [selectedVote, salt]));

    // Auto-save to localStorage
    const storageKey = `juror_commit_${dispute.dispute_id}_${userAddress.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify({ vote: selectedVote, salt }));

    console.log(`Saved commit vote ${selectedVote} with salt ${salt} for dispute ${dispute.dispute_id}`);
    
    commitVote(BigInt(dispute.dispute_id), commitHash);
  };

  // Perform Reveal Vote (retrieved from localStorage or manual)
  const handleRevealVote = () => {
    if (!dispute || !userAddress) return;
    
    // Attempt local load
    const storageKey = `juror_commit_${dispute.dispute_id}_${userAddress.toLowerCase()}`;
    const saved = localStorage.getItem(storageKey);
    
    let vote = revealVoteVal;
    let salt = revealSaltVal;

    if (saved) {
      const parsed = JSON.parse(saved);
      vote = parsed.vote;
      salt = parsed.salt;
    }

    if (!salt.trim()) {
      alert("Vui lòng nhập salt giải mã.");
      return;
    }

    revealVote(BigInt(dispute.dispute_id), vote, salt);
  };

  // Resolve / End Dispute
  const handleResolveDispute = () => {
    if (!dispute) return;
    resolveDispute(BigInt(dispute.dispute_id));
  };

  // Format reserve price / top bid
  const reservePrice = parseFloat(formatUnits(BigInt(auction.reserve_price), 18));
  const topBid = parseFloat(formatUnits(BigInt(auction.current_top_bid || '0'), 18));

  // User roles
  const isSeller = auction.seller.toLowerCase() === userAddress.toLowerCase();
  const isWinner = auction.current_top_bidder && auction.current_top_bidder.toLowerCase() === userAddress.toLowerCase();
  
  const isJuror = dispute && dispute.selected_jurors && dispute.selected_jurors.some(
    (j: string) => j.toLowerCase() === userAddress.toLowerCase()
  );

  const isParty = dispute && (
    userAddress.toLowerCase() === dispute.buyer.toLowerCase() ||
    userAddress.toLowerCase() === dispute.seller.toLowerCase()
  );

  const isEvidenceExpired = dispute && dispute.evidence_deadline
    ? new Date(dispute.evidence_deadline).getTime() <= Date.now()
    : false;

  const jurorVoteState = dispute && votes.find(
    (v: any) => v.juror.toLowerCase() === userAddress.toLowerCase()
  );

  // Retrieve saved local commit details if available
  const savedCommitInfo = dispute ? (() => {
    const key = `juror_commit_${dispute.dispute_id}_${userAddress.toLowerCase()}`;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  })() : null;

  // Convert Auction to NFT format for NFTDetailPreview
  const nftObj: NFT = {
    token_id: auction.nft_token_id,
    owner: auction.seller,
    name: auction.name || `Vật phẩm #${auction.nft_token_id}`,
    image: auction.image || '',
    token_uri: auction.token_uri || '',
    description: auction.description || '',
    images: auction.images || []
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* TẦNG 1: NFT PREVIEW & SPECS & CHAT (ĐỒNG NHẤT VỚI GAME THEORY) */}
      <div className={styles.detailGrid}>
        
        {/* Left Sub-column: NFT Preview */}
        <div className={styles.leftSubCol}>
          
          {/* NFT Preview */}
          <div className={`glass-panel ${styles.previewWrapper}`}>
            <NFTDetailPreview nft={nftObj} />
          </div>
        </div>

        {/* Right Sub-column: Specs & Chat Room */}
        <div className={styles.rightSubCol}>
          
          {/* Specs */}
          <div className={`glass-panel ${styles.technicalCard}`}>
            <h4 className={styles.technicalTitle}>Thông tin kỹ thuật</h4>
            <div className={styles.technicalGrid}>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Phương pháp bàn giao</span>
                <span className={styles.technicalValue} style={{ color: '#00e3fd', fontWeight: 'bold' }}>Biểu quyết Bồi thẩm đoàn</span>
              </div>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Giá thầu cuối cùng</span>
                <span className={styles.technicalValue}>{topBid.toFixed(2)} ADF</span>
              </div>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Người bán (Seller)</span>
                <span className={`${styles.technicalValue} ${styles.valueMono}`}>{auction.seller.slice(0, 8)}...{auction.seller.slice(-6)}</span>
              </div>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Người thắng (Winner)</span>
                <span className={`${styles.technicalValue} ${styles.valueMono}`}>{auction.current_top_bidder ? `${auction.current_top_bidder.slice(0, 8)}...${auction.current_top_bidder.slice(-6)}` : 'Không có'}</span>
              </div>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Token ID</span>
                <span className={`${styles.technicalValue} ${styles.valueMono}`}>#{auction.nft_token_id}</span>
              </div>
              <div className={styles.technicalItem}>
                <span className={styles.technicalLabel}>Mạng lưới blockchain</span>
                <span className={styles.technicalValue}>Hardhat Localhost</span>
              </div>
            </div>
          </div>

          {/* Chat Room */}
          <div className={`glass-panel ${styles.chatBox}`}>
            <div className={styles.chatHeader}>
              <div className={styles.chatTitleContainer}>
                <MessageSquare size={16} />
                <h3 className={styles.chatTitle}>Thảo luận Tòa án Bồi thẩm đoàn</h3>
              </div>
              <span className={styles.chatStatus}>
                ● {isSocketConnected ? 'WebSockets Live' : 'Mất kết nối'}
              </span>
            </div>

            <div className={styles.messagesList} ref={messagesListRef}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Kênh thảo luận công khai cho các bên và trọng tài. Nhập tin nhắn để bàn luận...
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`${styles.messageItem} ${msg.isSystem ? styles.messageSystem : ''}`}
                  >
                    <div className={styles.messageMeta}>
                      <span className={`${styles.messageSender} ${msg.isSystem ? styles.senderSystem : msg.user === 'Bạn' ? styles.senderMe : ''}`}>
                        {msg.user}
                      </span>
                      <span className={styles.messageTime}>{msg.time}</span>
                    </div>
                    <div className={styles.messageText}>{msg.text}</div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className={styles.chatInput}
                value={myMessage}
                onChange={(e) => setMyMessage(e.target.value)}
                placeholder="Nhập tin nhắn..."
                disabled={!isSocketConnected}
                style={{ flex: 1, padding: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', color: '#fff', fontSize: '0.85rem' }}
              />
              <button 
                type="submit" 
                className="btn btn-outline"
                disabled={!myMessage.trim() || !isSocketConnected}
                style={{ borderRadius: '20px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Gửi</span>
                <Send size={12} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* TẦNG 2: PHÒNG XỬ ÁN CHUYÊN BIỆT (TỰ PHÁT PHÁP LÝ & BỎ PHIẾU BỒI THẨM ĐOÀN) */}
      {loadingDispute ? (
        <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className={styles.spinner}></div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Đang đồng bộ hồ sơ tranh chấp từ Database...</p>
        </div>
      ) : !dispute ? (
        <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <Info size={36} />
          <h4 style={{ margin: 0 }}>Chưa phát sinh vụ tranh chấp nào</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mối quan hệ bàn giao đang diễn ra suôn sẻ, không phát sinh khiếu nại.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* A. DÒNG TIMELINE TRẠNG THÁI (ĐỘNG) */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} className="text-gold" />
                <span>Tiến Trình Giải Quyết Tranh Chấp</span>
              </h4>
              {timeLeft && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', background: 'rgba(242, 202, 80, 0.1)', border: '1px solid rgba(242, 202, 80, 0.25)', padding: '4px 12px', borderRadius: '20px', color: '#fbbf24', fontWeight: '600' }}>
                  <Clock size={12} />
                  <span>{timeLeft}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
              {/* Line background */}
              <div style={{ position: 'absolute', top: '15px', left: '40px', right: '40px', height: '2px', background: 'rgba(255,255,255,0.06)', zIndex: 1 }} />
              
              {/* Timeline steps */}
              {['EVIDENCE', 'COMMIT', 'REVEAL', 'RESOLVED'].map((ph, idx) => {
                const phasesLabel = ['Nộp Bằng chứng', 'Bỏ Phiếu Kín', 'Giải Mã Phiếu', 'Phán Quyết'];
                const isActive = dispute.phase === ph;
                const isPast = ['EVIDENCE', 'COMMIT', 'REVEAL', 'RESOLVED'].indexOf(dispute.phase) > idx || dispute.resolved;
                
                return (
                  <div key={ph} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2, position: 'relative', width: '80px' }}>
                    <div 
                      style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isActive ? 'var(--color-primary)' : isPast ? '#10b981' : '#1e293b',
                        border: `2px solid ${isActive ? 'rgba(242,202,80,0.4)' : 'transparent'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 'bold', fontSize: '0.85rem'
                      }}
                    >
                      {isPast ? <Check size={14} /> : idx + 1}
                    </div>
                    <span style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--color-primary)' : isPast ? '#10b981' : '#64748b', textAlign: 'center' }}>
                      {phasesLabel[idx]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. ĐỐI CHẤT BẰNG CHỨNG 2 BÊN (ĐỐI XỨNG CỰC ĐẸP) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            
            {/* Cột Trái: Bằng chứng Buyer */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <User size={18} style={{ color: '#3b82f6' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>Người Mua (Buyer)</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ví: {dispute.buyer}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Trình bày khiếu nại:</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', minHeight: '60px', lineHeight: '1.4' }}>
                  {dispute.buyer_description || "Không nộp mô tả."}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Hình ảnh bằng chứng:</span>
                {dispute.buyer_images && dispute.buyer_images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {dispute.buyer_images.map((imgUrl: string, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'zoom-in', background: 'rgba(0,0,0,0.2)' }}
                        onClick={() => setEnlargedImage(resolveIPFS(imgUrl, 1))}
                      >
                        <img src={resolveIPFS(imgUrl, 1)} alt={`Buyer Ev ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cung cấp hình ảnh.</p>
                )}
              </div>

              {dispute.buyer_evidence_ipfs && (
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
                  <a 
                    href={resolveIPFS(dispute.buyer_evidence_ipfs, 1, 'metadata')} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: '0.72rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <FileText size={12} />
                    <span>Xem file bằng chứng gốc on-chain (IPFS)</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>

            {/* Cột Phải: Bằng chứng Seller */}
            <div className="glass-panel" style={{ padding: '24px', borderLeft: '3px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <User size={18} style={{ color: '#fbbf24' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>Người Bán (Seller)</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Ví: {dispute.seller}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Trình bày đối chất:</span>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', minHeight: '60px', lineHeight: '1.4' }}>
                  {dispute.seller_description || "Người bán chưa cung cấp phản hồi biện hộ."}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>Hình ảnh đối chất:</span>
                {dispute.seller_images && dispute.seller_images.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    {dispute.seller_images.map((imgUrl: string, idx: number) => (
                      <div 
                        key={idx} 
                        style={{ aspectRatio: '1/1', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', cursor: 'zoom-in', background: 'rgba(0,0,0,0.2)' }}
                        onClick={() => setEnlargedImage(resolveIPFS(imgUrl, 1))}
                      >
                        <img src={resolveIPFS(imgUrl, 1)} alt={`Seller Ev ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Chưa cung cấp hình ảnh.</p>
                )}
              </div>

              {dispute.seller_evidence_ipfs && (
                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px dashed rgba(255,255,255,0.04)' }}>
                  <a 
                    href={resolveIPFS(dispute.seller_evidence_ipfs, 1, 'metadata')} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    style={{ fontSize: '0.72rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                  >
                    <FileText size={12} />
                    <span>Xem file bằng chứng gốc on-chain (IPFS)</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* C. NỘP BẰNG CHỨNG ĐỐI CHẤT (Chỉ hiển thị trong pha EVIDENCE cho Buyer/Seller) */}
          {dispute.phase === 'EVIDENCE' && isParty && (
            <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(242, 202, 80, 0.2)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={18} className="text-gold" />
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff', fontWeight: 'bold' }}>Nộp / Cập Nhật Bằng Chứng Đối Chất</h4>
                </div>
                {!showEvidenceForm && !isEvidenceExpired && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => setShowEvidenceForm(true)}
                    style={{ padding: '6px 16px', fontSize: '0.8rem' }}
                  >
                    Bắt đầu nộp bằng chứng
                  </button>
                )}
              </div>

              {isEvidenceExpired ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', padding: '14px', borderRadius: '8px', color: '#ef4444', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>Hạn nộp thêm bằng chứng đã kết thúc. Vui lòng đợi Oracle chỉ định Trọng tài để bắt đầu biểu quyết.</span>
                </div>
              ) : showEvidenceForm && (
                <div>
                  {evidenceStep === 'idle' && (
                    <form onSubmit={handleEvidenceSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      <p style={{ color: '#94a3b8', fontSize: '0.82rem', lineHeight: '1.4', margin: 0 }}>
                        Vui lòng nhập mô tả sự việc và chọn các hình ảnh bằng chứng đối chất. Hệ thống sẽ tải lên IPFS và ghi nhận giao dịch của bạn on-chain.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Mô tả chi tiết bằng chứng *</label>
                        <textarea
                          value={evidenceDescInput}
                          onChange={(e) => setEvidenceDescInput(e.target.value)}
                          placeholder="Mô tả cụ thể lý lẽ, bằng chứng hoặc lời đối chất của bạn..."
                          required
                          style={{
                            minHeight: '80px', padding: '10px',
                            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', color: '#fff', resize: 'vertical', fontSize: '0.85rem'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Hình ảnh bằng chứng *</label>
                        
                        <div 
                          className={styles.uploadDropzone} 
                          onClick={() => document.getElementById('disputeEvidenceFileInput')?.click()}
                          style={{ minHeight: '100px', borderStyle: 'dashed' }}
                        >
                          <input 
                            type="file" 
                            id="disputeEvidenceFileInput" 
                            accept="image/*" 
                            multiple 
                            style={{ display: 'none' }} 
                            onChange={handleEvidenceFileChange} 
                          />
                          <span className={`material-symbols-outlined ${styles.uploadIcon}`} style={{ fontSize: '1.8rem' }}>cloud_upload</span>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>Chọn hình ảnh bằng chứng</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hỗ trợ nhiều ảnh PNG, JPG.</div>
                        </div>

                        {evidencePreviewUrls.length > 0 && (
                          <div className={styles.uploadPreviewGrid}>
                            {evidencePreviewUrls.map((url, index) => (
                              <div 
                                key={index} 
                                className={styles.uploadPreviewItem} 
                                onClick={(e) => { e.stopPropagation(); setEnlargedImage(url); }}
                              >
                                <img src={url} alt={`Preview ${index}`} className={styles.uploadPreviewImg} />
                                <button 
                                  type="button" 
                                  className={styles.removePreviewBtn}
                                  onClick={(e) => removeEvidenceFile(e, index)}
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => setShowEvidenceForm(false)}
                          style={{ flex: 1, padding: '10px' }}
                        >
                          HỦY
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ flex: 1, padding: '10px' }}
                        >
                          GỬI BẰNG CHỨNG
                        </button>
                      </div>
                    </form>
                  )}

                  {evidenceStep === 'uploading' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', gap: '1rem', textAlign: 'center' }}>
                      <div className={styles.spinner}></div>
                      <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>Đang xử lý & tải lên IPFS...</p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đang đẩy hình ảnh và biên soạn JSON metadata lên IPFS (Pinata Gateway).</span>
                    </div>
                  )}

                  {evidenceStep === 'submitting' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0', gap: '1rem', textAlign: 'center' }}>
                      <div className={styles.spinner}></div>
                      <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>Đang gửi giao dịch lên blockchain...</p>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vui lòng xác nhận giao dịch nộp bằng chứng (submitEvidence) trên Metamask.</span>
                    </div>
                  )}

                  {evidenceStep === 'error' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0', gap: '1rem', textAlign: 'center' }}>
                      <AlertTriangle size={40} style={{ color: '#ef4444' }} />
                      <p style={{ color: '#ef4444', fontWeight: 'bold', margin: 0 }}>Nộp bằng chứng thất bại</p>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{evidenceErrMsg}</span>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={() => setEvidenceStep('idle')}
                        style={{ marginTop: '1rem', width: '120px' }}
                      >
                        Thử lại
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* C. BẢNG BIỂU QUYẾT & BẢNG ĐIỀU KHIỂN TRỌNG TÀI */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.60fr 1.40fr', gap: '20px' }}>
            
            {/* C.1 Bảng kết quả phiếu bầu (Công khai) */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} className="text-gold" />
                <span>Trạng Thái Phiếu Bầu Trọng Tài</span>
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                
                {/* 5 Trọng tài được chỉ định */}
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>Trọng tài (Juror)</span>
                    <span style={{ textAlign: 'center' }}>Commit</span>
                    <span style={{ textAlign: 'center' }}>Reveal</span>
                  </div>

                  {dispute.selected_jurors.map((jurorAddr: string, idx: number) => {
                    const jurorLower = jurorAddr.toLowerCase();
                    const vInfo = votes.find(v => v.juror.toLowerCase() === jurorLower);
                    const isJurorMe = jurorLower === userAddress.toLowerCase();

                    return (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', padding: '10px 12px', fontSize: '0.8rem', borderBottom: idx < 4 ? '1px solid rgba(255,255,255,0.03)' : 'none', color: isJurorMe ? 'var(--color-primary)' : '#e2e8f0', fontWeight: isJurorMe ? 'bold' : 'normal' }}>
                        <span>
                          {jurorAddr.slice(0, 6)}...{jurorAddr.slice(-4)} {isJurorMe && '(Bạn)'}
                        </span>
                        <span style={{ textAlign: 'center' }}>
                          {vInfo?.has_committed ? (
                            <span style={{ color: '#10b981' }}>● Đã Commit</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>○ Chờ...</span>
                          )}
                        </span>
                        <span style={{ textAlign: 'center' }}>
                          {vInfo?.has_revealed ? (
                            <span style={{ color: '#10b981' }}>
                              ● {vInfo.revealed_vote === 1 ? 'Buyer' : 'Seller'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>○ Chờ...</span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Kết quả biểu quyết chi tiết */}
                {dispute.phase !== 'EVIDENCE' && dispute.phase !== 'COMMIT' && (
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng số phiếu bầu đã giải mã (Reveal):</span>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>Người mua (Buyer)</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{dispute.buyer_votes} phiếu</span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.8rem', color: '#fbbf24', fontWeight: 'bold' }}>Người bán (Seller)</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{dispute.seller_votes} phiếu</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* C.2 Bảng điều khiển đặc quyền Trọng tài (Juror Dashboard) */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} className="text-gold" />
                <span>Bảng Trọng Tài Phán Xử</span>
              </h4>

              {/* TH1: Người dùng KHÔNG phải Trọng tài */}
              {!isJuror && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', color: 'var(--text-muted)', gap: '8px' }}>
                  <User size={32} />
                  <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.4' }}>Bạn không phải trọng tài được phân phán xử vụ tranh chấp này.</p>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Hồ sơ vụ việc chỉ mở công khai cho việc đối chất và theo dõi.</span>
                </div>
              )}

              {/* TH2: Người dùng LÀ Trọng tài */}
              {isJuror && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Pha EVIDENCE */}
                  {dispute.phase === 'EVIDENCE' && (
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      <Clock size={32} style={{ color: 'var(--color-primary)' }} />
                      <h5 style={{ margin: 0, color: '#fff' }}>Pha thu thập bằng chứng</h5>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Tòa án đang đợi 2 bên cung cấp và bổ sung tài liệu bằng chứng. Sau khi hết thời gian nộp bằng chứng, Oracle sẽ chuyển sang pha Bỏ phiếu.
                      </p>
                    </div>
                  )}

                  {/* Pha COMMIT */}
                  {dispute.phase === 'COMMIT' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                      
                      {jurorVoteState?.has_committed ? (
                        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center', flex: 1 }}>
                          <Check size={32} style={{ color: '#10b981' }} />
                          <h5 style={{ margin: 0, color: '#fff' }}>Đã Commit phiếu thành công</h5>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Phiếu bầu kín của bạn đã được gửi lên blockchain. Vui lòng chờ đến khi hết hạn Commit để giải mã (Reveal) phiếu bầu.
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Lựa chọn phân xử của bạn (Commit):</span>
                          
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              className={`${styles.disputeCard} ${selectedVote === 1 ? styles.disputeCardActive : ''}`}
                              onClick={() => setSelectedVote(1)}
                              style={{ flex: 1, padding: '14px', background: selectedVote === 1 ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.01)', borderColor: selectedVote === 1 ? '#3b82f6' : 'rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff' }}
                            >
                              <User size={20} style={{ color: '#3b82f6', marginBottom: '6px' }} />
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Buyer Thắng</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Hoàn tiền cho Buyer</div>
                            </button>

                            <button
                              type="button"
                              className={`${styles.disputeCard} ${selectedVote === 2 ? styles.disputeCardActive : ''}`}
                              onClick={() => setSelectedVote(2)}
                              style={{ flex: 1, padding: '14px', background: selectedVote === 2 ? 'rgba(250,189,36,0.15)' : 'rgba(255,255,255,0.01)', borderColor: selectedVote === 2 ? '#fabd24' : 'rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff' }}
                            >
                              <User size={20} style={{ color: '#fabd24', marginBottom: '6px' }} />
                              <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Seller Thắng</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>Giao tiền cho Seller</div>
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn btn-primary w-full"
                            onClick={handleCommitVote}
                            disabled={selectedVote === null || isPendingCommit || isConfirmingCommit}
                            style={{ marginTop: 'auto', padding: '12px', fontWeight: 'bold' }}
                          >
                            {isPendingCommit || isConfirmingCommit ? 'Đang gửi giao dịch...' : 'NỘP PHIẾU BẦU KÍN (COMMIT)'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pha REVEAL */}
                  {dispute.phase === 'REVEAL' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
                      
                      {jurorVoteState?.has_revealed ? (
                        <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'center', flex: 1 }}>
                          <ShieldCheck size={32} style={{ color: '#10b981' }} />
                          <h5 style={{ margin: 0, color: '#fff' }}>Giải mã phiếu hoàn tất</h5>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            Phiếu bầu thực của bạn đã được đếm. Cảm ơn sự tham gia phán xử công minh của bạn!
                          </p>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                          
                          {savedCommitInfo ? (
                            /* TỰ ĐỘNG LẤY TỪ LOCALSTORAGE ĐỂ GIẢI MÃ NHANH */
                            <div style={{ background: 'rgba(242,202,80,0.04)', border: '1px solid rgba(242,202,80,0.15)', padding: '16px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 'bold' }}>
                                <Info size={14} />
                                <span>Tìm thấy phiếu bầu đã lưu cục bộ</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#fff' }}>
                                Lựa chọn đã lưu: <strong>{savedCommitInfo.vote === 1 ? 'Người mua thắng' : 'Người bán thắng'}</strong>
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                Mã khóa (Salt): {savedCommitInfo.salt}
                              </span>
                            </div>
                          ) : (
                            /* NHẬP THỦ CÔNG */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: '#ef4444', fontStyle: 'italic' }}>Không tìm thấy thông tin đã lưu. Vui lòng tự nhập chính xác phiếu và mã salt bạn đã commit:</span>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Lựa chọn phiếu bầu:</label>
                                <select 
                                  value={revealVoteVal} 
                                  onChange={(e) => setRevealVoteVal(parseInt(e.target.value))}
                                  style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                                >
                                  <option value={1}>Buyer Thắng</option>
                                  <option value={2}>Seller Thắng</option>
                                </select>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Mã giải mã (Salt):</label>
                                <input
                                  type="text"
                                  placeholder="Nhập salt giải mã..."
                                  value={revealSaltVal}
                                  onChange={(e) => setRevealSaltVal(e.target.value)}
                                  style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: '#fff', fontSize: '0.8rem' }}
                                />
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            className="btn btn-primary w-full"
                            onClick={handleRevealVote}
                            disabled={isPendingReveal || isConfirmingReveal}
                            style={{ marginTop: 'auto', padding: '12px', fontWeight: 'bold' }}
                          >
                            {isPendingReveal || isConfirmingReveal ? 'Đang gửi giao dịch...' : 'GIẢI MÃ & MỞ PHIẾU BẦU (REVEAL)'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pha RESOLVED */}
                  {dispute.phase === 'RESOLVED' && (
                    <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '20px', borderRadius: '12px', textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                      <ShieldCheck size={32} style={{ color: '#10b981' }} />
                      <h5 style={{ margin: 0, color: '#fff' }}>Vụ án đã đóng</h5>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        Tranh chấp đã có kết luận cuối cùng. Tiền ký quỹ được giải phóng và chuyển giao về cho bên chiến thắng.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* D. ĐÓNG VỤ TRANH CHẤP (Chỉ hiển thị khi đã hết hạn Reveal và chưa Resolved) */}
          {dispute.phase === 'REVEAL' && !dispute.resolved && (
            <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid rgba(242,202,80,0.1)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Clock size={20} className="text-gold" style={{ marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>Kết Thúc & Thi Hành Án</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Sau khi thời gian Giải mã (Reveal) kết thúc, bất kỳ ai cũng có quyền kích hoạt Đóng và thi hành án tranh chấp. Hợp đồng thông minh sẽ tự động đếm phiếu bầu thực tế, trao thưởng cho trọng tài phán quyết đúng và hoàn trả/chuyển giao tài sản về ví bên thắng.
                  </p>
                </div>
              </div>

              {/* Nút Resolve (hiển thị khi hết hạn) */}
              <button
                type="button"
                className="btn btn-gradient w-full"
                onClick={handleResolveDispute}
                disabled={isPendingResolve || isConfirmingResolve}
                style={{ padding: '12px', fontWeight: 'bold', marginTop: '10px' }}
              >
                {isPendingResolve || isConfirmingResolve ? 'Đang đóng vụ án...' : 'ĐÓNG & THI HÀNH ÁN TRANH CHẤP (RESOLVE)'}
              </button>
            </div>
          )}

          {/* E. BANNER PHÁN QUYẾT CHIẾN THẮNG CUỐI CÙNG (RESOLVED) */}
          {dispute.resolved && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', border: '2px solid #10b981', background: 'rgba(16,185,129,0.03)', gap: '10px' }}>
              <Check size={48} style={{ color: '#10b981' }} />
              <h3 style={{ margin: 0, color: '#fff', fontWeight: 'bold' }}>TRANH CHẤP ĐÃ ĐƯỢC PHÂN XỬ</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.4' }}>
                Bồi thẩm đoàn đã đưa ra phán quyết tối cao: {dispute.buyer_votes >= dispute.seller_votes ? (
                  <strong style={{ color: '#3b82f6' }}>NGƯỜI MUA (BUYER) THẮNG CUỘC</strong>
                ) : (
                  <strong style={{ color: '#fbbf24' }}>NGƯỜI BÁN (SELLER) THẮNG CUỘC</strong>
                )}. Giao dịch đã kết thúc, NFT và tiền thầu đã được giải phóng phân phối.
              </p>
            </div>
          )}
        </div>
      )}

      {/* F. MODAL PHÓNG TO HÌNH ẢNH XEM TRƯỚC */}
      {enlargedImage && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1100, padding: '20px'
          }}
          onClick={() => setEnlargedImage(null)}
        >
          <img 
            src={enlargedImage} 
            alt="Enlarged Evidence" 
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }} 
          />
        </div>
      )}

    </div>
  );
};

export default JuryVotingEscrow;
