//@ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import io, { Socket } from 'socket.io-client';
import Layout from '../components/layout/Layout';
import { NFTDetailPreview, type NFT } from '../components/common/NFTDetailPreview';
import { useADFBalance, useADFAllowance, usePendingReturns } from '../hooks/useReadContract';
import { useBid, useApproveADF, useConfirmDelivery, useOpenDispute, useFaucet, useWithdraw } from '../hooks/useContractActions';
import FloatingWalletWidget from '../components/layout/FloatingWalletWidget/FloatingWalletWidget';
import { CONTRACT_ADDRESSES, API_URL } from '../config/contracts';
import { resolveIPFS } from '../hooks/useNFTImage';
import { type AuctionFromAPI } from '../hooks/useAuctions';
import styles from './Auction.module.css';

import {
  Clock,
  Scale,
  Eye,
  Award,
  AlertTriangle,
  MessageSquare,
  Send,
  ExternalLink,
  ShieldAlert,
  Coins,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

const Auction: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isConnected, address: userAddress } = useAccount();

  // Data state
  const [auction, setAuction] = useState<AuctionFromAPI | null>(null);
  const [loading, setLoading] = useState(true);

  // Web3 read hooks
  const { data: balance, refetch: refetchBalance } = useADFBalance(userAddress);
  const { data: allowance, refetch: refetchAllowance } = useADFAllowance(userAddress);

  // Web3 action hooks
  const {
    approve: approveADF,
    isPending: isApproving,
    isConfirming: isAdfConfirming,
    isConfirmed: isAdfConfirmed
  } = useApproveADF();

  const {
    bid,
    isPending: isBidding,
    isConfirming: isBidConfirming,
    isConfirmed: isBidConfirmed,
    error: bidError
  } = useBid();

  const {
    confirmDelivery,
    isPending: isConfirmingDelivery,
    isConfirming: isDeliveryTxConfirming,
    isConfirmed: isDeliveryConfirmed,
    error: deliveryError
  } = useConfirmDelivery();

  const {
    openDispute,
    isPending: isOpeningDispute,
    isConfirming: isDisputeTxConfirming,
    isConfirmed: isDisputeConfirmed,
    error: disputeError
  } = useOpenDispute();

  // Floating Wallet Hooks
  const { data: pendingReturns, refetch: refetchPendingReturns } = usePendingReturns(userAddress);
  const { faucet, isPending: isFauceting, isConfirming: isFaucetConfirming, isConfirmed: isFaucetConfirmed } = useFaucet();
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithdrawConfirming, isConfirmed: isWithdrawConfirmed } = useWithdraw();

  useEffect(() => {
    if (isFaucetConfirmed) {
      refetchBalance();
    }
  }, [isFaucetConfirmed, refetchBalance]);

  useEffect(() => {
    if (isWithdrawConfirmed) {
      refetchBalance();
      refetchPendingReturns();
    }
  }, [isWithdrawConfirmed, refetchBalance, refetchPendingReturns]);

  // Local Form / UI States
  const [bidAmount, setBidAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'approving_adf' | 'bidding' | 'success' | 'error'>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);

  // Dispute modal states
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [evidenceDesc, setEvidenceDesc] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [disputeStep, setDisputeStep] = useState<'idle' | 'uploading' | 'submitting' | 'success' | 'error'>('idle');
  const [disputeErrMsg, setDisputeErrMsg] = useState('');
  const [localPhaseOverride, setLocalPhaseOverride] = useState<string | null>(null);

  const previewUrlsRef = useRef(previewUrls);
  useEffect(() => {
    previewUrlsRef.current = previewUrls;
  }, [previewUrls]);

  // WebSocket Chat States
  const [socket, setSocket] = useState<Socket | null>(null);
  const [chatMessages, setChatMessages] = useState<{ user: string; text: string; time: string; isSystem?: boolean }[]>([]);
  const [myMessage, setMyMessage] = useState('');
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch auction details from REST API
  const fetchAuctionDetails = () => {
    if (!id) return;
    fetch(`${API_URL}/api/auctions/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          setAuction(data.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch auction details:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAuctionDetails();
  }, [id]);

  // Connect WebSockets and join room
  useEffect(() => {
    if (!auction) return;

    // Extract socket host (API_URL without /api, e.g. http://localhost:4000)
    const socketUrl = API_URL.replace('/api', '') || 'http://localhost:4000';
    const socketHost = socketUrl.includes('localhost') ? 'http://localhost:4000' : socketUrl;

    const newSocket = io(socketHost);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsSocketConnected(true);
      newSocket.emit('joinAuction', {
        auctionId: auction.auction_id,
        walletAddress: userAddress || 'Khách vãng lai'
      });
    });

    newSocket.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    newSocket.on('message', (msgData: any) => {
      const date = new Date(msgData.timestamp);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      // If a bid event is broadcasted, trigger API reload immediately
      if (msgData.isSystem && msgData.message.includes('đã đặt giá thầu')) {
        fetchAuctionDetails();
        refetchBalance();
      }

      setChatMessages(prev => [
        ...prev,
        {
          user: msgData.sender === 'Hệ thống'
            ? 'Hệ thống'
            : msgData.sender.toLowerCase() === userAddress?.toLowerCase()
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

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Countdown timer
  useEffect(() => {
    if (!auction) return;
    const endTime = new Date(auction.end_time).getTime();

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [auction]);

  // Handle ADF approval confirmation
  useEffect(() => {
    if (isAdfConfirmed && step === 'approving_adf' && auction) {
      refetchAllowance().then(() => {
        setStep('bidding');
        const amountWei = parseUnits(bidAmount, 18);
        bid(BigInt(auction.auction_id), amountWei);
      });
    }
  }, [isAdfConfirmed, step, auction]);

  // Handle bid transaction confirmation
  useEffect(() => {
    if (isBidConfirmed) {
      setStep('success');
      setBidAmount('');
      refetchBalance();
      fetchAuctionDetails();

      const timer = setTimeout(() => {
        setStep('idle');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isBidConfirmed]);

  // Handle bid error
  useEffect(() => {
    if (bidError) {
      setStep('error');
    }
  }, [bidError]);

  // Handle delivery confirmation
  useEffect(() => {
    if (isDeliveryConfirmed) {
      alert("Xác nhận đã nhận hàng thành công! Tiền ký quỹ đã giải phóng về Seller.");
      fetchAuctionDetails();
    }
  }, [isDeliveryConfirmed]);

  // Handle dispute opening confirmation
  useEffect(() => {
    if (isDisputeConfirmed) {
      alert("Đã mở khiếu nại tranh chấp thành công trên Blockchain!");
      setLocalPhaseOverride('DISPUTE_OPENED');
      setShowDisputeModal(false);
      setDisputeStep('idle');
      setEvidenceDesc('');
      setSelectedFiles([]);

      // Revoke preview urls safely
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);

      // Poll server to sync status
      let pollCount = 0;
      const interval = setInterval(() => {
        pollCount++;
        fetchAuctionDetails();
        if (pollCount >= 6) {
          clearInterval(interval);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [isDisputeConfirmed]);

  // Handle dispute or delivery errors
  useEffect(() => {
    if (deliveryError) {
      alert(`Lỗi xác nhận bàn giao: ${deliveryError.message || 'Thao tác thất bại'}`);
    }
  }, [deliveryError]);

  useEffect(() => {
    if (disputeError) {
      setDisputeStep('error');
      setDisputeErrMsg(disputeError.message || 'Lỗi khi mở giao dịch tranh chấp on-chain.');
    }
  }, [disputeError]);

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
          <div className={styles.spinner}></div>
          <p style={{ color: 'var(--text-muted)' }}>Đang tải thông tin phòng đấu giá...</p>
        </div>
      </Layout>
    );
  }

  if (!auction) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--text-muted)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444' }}>error</span>
          <h3>Không tìm thấy phiên đấu giá</h3>
          <Link to="/" className="btn btn-outline" style={{ marginTop: '16px' }}>Quay về trang chủ</Link>
        </div>
      </Layout>
    );
  }

  // Formatting values
  const currentBid = parseFloat(formatUnits(BigInt(auction.current_top_bid || '0'), 18));
  const reservePrice = parseFloat(formatUnits(BigInt(auction.reserve_price), 18));
  const minIncrement = parseFloat(formatUnits(BigInt(auction.min_bid_increment), 18));
  const minimumBid = currentBid > 0 ? currentBid + minIncrement : reservePrice;
  const userBalance = balance !== undefined ? parseFloat(formatUnits(balance, 18)) : 0;

  // Escrow details
  const isGameTheory = auction.dispute_type === 'GAME_THEORY_ESCROW';
  const buyerDepositFloat = isGameTheory ? reservePrice : 0;
  const buyerDepositWei = isGameTheory ? BigInt(auction.reserve_price) : 0n;

  const isEnded = !auction.active || secondsLeft <= 0;

  // Bid Validation
  const inputAmount = parseFloat(bidAmount) || 0;
  const isValidAmount = inputAmount >= minimumBid;
  const hasEnoughBalance = (inputAmount + buyerDepositFloat) <= userBalance;

  // Format Time left
  const formatTime = (totalSeconds: number) => {
    if (totalSeconds <= 0) {
      return { hours: '00', minutes: '00', seconds: '00', isEnded: true };
    }
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
      isEnded: false
    };
  };

  const timerData = formatTime(secondsLeft);

  // Submit Bid Flow
  const handlePlaceBid = () => {
    if (!isConnected) {
      alert("Vui lòng kết nối ví trước.");
      return;
    }
    if (!isValidAmount) {
      alert(`Giá thầu tối thiểu phải là ${minimumBid.toFixed(2)} ADF`);
      return;
    }
    if (!hasEnoughBalance) {
      alert(`Số dư không đủ! Cần có ít nhất ${(inputAmount + buyerDepositFloat).toFixed(2)} ADF bao gồm cả tiền cọc.`);
      return;
    }

    const amountWei = parseUnits(bidAmount, 18);
    const totalRequiredWei = amountWei + buyerDepositWei;

    // Check ADF Allowance
    if (allowance !== undefined && allowance < totalRequiredWei) {
      setStep('approving_adf');
      approveADF(undefined, totalRequiredWei);
    } else {
      setStep('bidding');
      bid(BigInt(auction.auction_id), amountWei);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myMessage.trim() || !socket) return;
    socket.emit('sendMessage', {
      auctionId: auction.auction_id,
      message: myMessage,
      sender: userAddress?.toLowerCase() || 'Anonymous'
    });
    setMyMessage('');
  };

  const renderEscrowOrEndPanel = () => {
    if (!auction) return null;

    const isPhysical = auction.asset_type === 'PHYSICAL';
    const hasBids = currentBid > 0;
    const isSeller = userAddress?.toLowerCase() === auction.seller.toLowerCase();
    const isWinner = hasBids && userAddress?.toLowerCase() === auction.current_top_bidder?.toLowerCase();

    // Nếu không ai bid -> Trả NFT về Seller
    if (!hasBids) {
      return (
        <div style={{ textAlign: 'center', padding: '10px', color: '#64748b' }}>
          <AlertCircle size={24} style={{ color: '#ef4444', marginBottom: '8px' }} />
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Phiên đấu giá đã kết thúc mà không có ai đặt giá thầu.</p>
          {isSeller && <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>NFT đã được hoàn trả về ví của bạn.</p>}
        </div>
      );
    }

    // Nếu là hàng kỹ thuật số (DIGITAL) -> Đã hoàn tất ngay khi kết thúc
    if (!isPhysical) {
      return (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
            <Check size={18} />
            <span>Giao dịch hoàn tất</span>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
            Tài sản kỹ thuật số đã chuyển trực tiếp cho Winner, tiền bid đã giải phóng cho Seller.
          </p>
        </div>
      );
    }

    // Đối với hàng VẬT LÝ (PHYSICAL):
    // Phân nhánh dựa theo phase
    const currentPhase = localPhaseOverride || auction.phase;
    switch (currentPhase) {
      case 'ESCROW_HOLDING': {
        const isExpired = auction.escrow_deadline ? new Date(auction.escrow_deadline).getTime() <= Date.now() : false;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: 'rgba(242, 202, 80, 0.05)', border: '1px solid rgba(242, 202, 80, 0.15)', padding: '12px', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 'bold', fontSize: '0.85rem' }}>
                <Coins size={14} />
                <span>Đang giữ ký quỹ (Escrow Holding)</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                {auction.escrow_deadline ? `Hạn chót khiếu nại: ${new Date(auction.escrow_deadline).toLocaleString()}` : 'Chờ nhận hàng'}
              </p>
            </div>

            {isWinner && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="btn btn-primary w-full"
                  onClick={() => {
                    if (confirm("Bạn có chắc chắn xác nhận đã nhận hàng đúng mô tả? Hành động này sẽ giải phóng tiền cho người bán và không thể hoàn tác.")) {
                      confirmDelivery(BigInt(auction.auction_id));
                    }
                  }}
                  disabled={isConfirmingDelivery || isDeliveryTxConfirming}
                  style={{ padding: '12px', fontWeight: 'bold' }}
                >
                  {isConfirmingDelivery || isDeliveryTxConfirming ? 'Đang giao dịch...' : 'XÁC NHẬN ĐÃ NHẬN HÀNG'}
                </button>

                {!isExpired && (
                  <button
                    className="btn btn-outline w-full"
                    onClick={() => setShowDisputeModal(true)}
                    style={{ borderColor: '#ef4444', color: '#ef4444', padding: '12px' }}
                  >
                    KHIẾU NẠI / MỞ TRANH CHẤP
                  </button>
                )}
              </div>
            )}

            {isSeller && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', padding: '0 4px', lineHeight: '1.4' }}>
                  Vui lòng bàn giao vật phẩm tới địa chỉ người mua. Nếu người mua nhận hàng nhưng không bấm xác nhận hoặc có sự cố, bạn có thể mở khiếu nại.
                </div>
                {!isExpired && (
                  <button
                    className="btn btn-outline w-full"
                    onClick={() => setShowDisputeModal(true)}
                    style={{ borderColor: '#fbbf24', color: '#fbbf24', padding: '12px' }}
                  >
                    MỞ KHIẾU NẠI TRANH CHẤP
                  </button>
                )}
              </div>
            )}

            {!isWinner && !isSeller && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Phiên đấu giá đang trong pha bàn giao tài sản vật lý.
              </p>
            )}
          </div>
        );
      }

      case 'DISPUTE_OPENED': {
        return (
          <div style={{ textAlign: 'center', padding: '8px' }}>
            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '8px' }}>
              <ShieldAlert size={18} />
              <span>Đang có Tranh chấp xảy ra!</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 12px 0' }}>
              Vụ tranh chấp đang được Bồi thẩm đoàn bỏ phiếu phân xử.
            </p>
            {auction.dispute_id ? (
              <Link
                to={`/dispute/${auction.dispute_id}`}
                className="btn btn-gradient w-full"
                style={{ padding: '12px', textDecoration: 'none', display: 'block', textAlign: 'center' }}
              >
                ĐI TỚI PHÒNG XỬ ÁN
              </Link>
            ) : (
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Chờ đồng bộ thông tin tòa án từ blockchain...</p>
            )}
          </div>
        );
      }

      case 'RESOLVED': {
        return (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
              <Check size={18} />
              <span>Giao dịch hoàn tất</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
              Ký quỹ đã được giải phóng thành công. Tiền và NFT đã được phân phối đúng địa chỉ.
            </p>
          </div>
        );
      }

      case 'CANCELED': {
        return (
          <div style={{ textAlign: 'center', padding: '10px' }}>
            <div style={{ color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 'bold', fontSize: '0.95rem' }}>
              <X size={18} />
              <span>Phiên đấu giá bị Hủy</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px', marginBottom: 0 }}>
              NFT đã được hoàn trả về cho Seller. Tiền cọc/tiền bid đã được hoàn hoặc xử lý.
            </p>
          </div>
        );
      }

      default: {
        return (
          <button className="btn btn-disabled w-full" disabled style={{ padding: '14px' }}>
            PHIÊN ĐẤU GIÁ ĐÃ KẾT THÚC
          </button>
        );
      }
    }
  };

  const renderDisputeModal = () => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const filesArray = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...filesArray]);

        const urls = filesArray.map(file => URL.createObjectURL(file));
        setPreviewUrls(prev => [...prev, ...urls]);
      }
    };

    const removeFile = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      setPreviewUrls(prev => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    };

    const isGameTheory = Number(auction!.dispute_type) === 1 || auction!.dispute_type === 'GAME_THEORY_ESCROW';

    const handleDisputeSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (isGameTheory) {
        try {
          setDisputeStep('submitting');
          openDispute(BigInt(auction!.auction_id), "Game Theory Escrow Delivery Failed");
        } catch (err: any) {
          console.error(err);
          setDisputeStep('error');
          setDisputeErrMsg(err.message || 'Mở tranh chấp thất bại.');
        }
        return;
      }

      if (!evidenceDesc.trim()) {
        alert("Vui lòng nhập mô tả chi tiết khiếu nại.");
        return;
      }
      if (selectedFiles.length === 0) {
        alert("Vui lòng chọn ít nhất một hình ảnh bằng chứng.");
        return;
      }

      try {
        setDisputeStep('uploading');
        setDisputeErrMsg('');

        // 1. Tải mô tả và nhiều ảnh lên IPFS thông qua API backend
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('description', evidenceDesc);
        formData.append('auctionId', auction!.auction_id.toString());
        formData.append('initiator', userAddress || '');

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

        // 2. Kích hoạt transaction on-chain
        setDisputeStep('submitting');
        openDispute(BigInt(auction!.auction_id), ipfsHash);
      } catch (err: any) {
        console.error(err);
        setDisputeStep('error');
        setDisputeErrMsg(err.message || 'Mở tranh chấp thất bại.');
      }
    };

    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}
        onClick={() => {
          if (disputeStep !== 'uploading' && disputeStep !== 'submitting') {
            setShowDisputeModal(false);
          }
        }}
      >
        <div
          className="glass-panel"
          style={{
            maxWidth: '550px', width: '100%', padding: '2rem',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
            maxHeight: '90vh', overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            <ShieldAlert size={24} style={{ color: '#ef4444' }} />
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.25rem', fontWeight: 'bold' }}>Mở Khiếu Nại & Tranh Chấp</h3>
          </div>

          {disputeStep === 'idle' && (
            <form onSubmit={handleDisputeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isGameTheory ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ color: '#ef4444', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                    <strong>CẢNH BÁO:</strong> Bạn đang yêu cầu xác nhận <strong>Bàn giao thất bại</strong>. Do phiên này sử dụng cơ chế bảo vệ Lý thuyết trò chơi, hành động này sẽ ngay lập tức khóa toàn bộ cọc ký quỹ của hai bên và tiền thầu.<br/><br/>
                    Sau khi bấm nút bên dưới, hệ thống sẽ mở trạng thái tranh chấp. Một trong hai bên có thể kích hoạt Đốt cọc ngay sau đó để hủy phiên.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.4', margin: 0 }}>
                    Bạn đang yêu cầu mở phiên tranh chấp cho đấu giá #{auction!.auction_id}. Vui lòng mô tả vấn đề và cung cấp bằng chứng hình ảnh (ảnh chụp vật phẩm bị lỗi/giả) để gửi tới Bồi thẩm đoàn.
                  </p>

                  {/* Mô tả bằng chữ */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Mô tả chi tiết sự việc *</label>
                    <textarea
                      className={styles.chatInput}
                      value={evidenceDesc}
                      onChange={(e) => setEvidenceDesc(e.target.value)}
                      placeholder="Mô tả cụ thể vấn đề bạn gặp phải với tài sản bàn giao..."
                      required
                      style={{
                        minHeight: '80px', padding: '10px',
                        background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px', color: '#fff', resize: 'vertical', fontSize: '0.85rem'
                      }}
                    />
                  </div>

                  {/* Upload Zone & Preview Grid (Giống đúc Mint.tsx) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#e2e8f0', fontWeight: '600' }}>Hình ảnh bằng chứng *</label>

                    <div
                      className={styles.uploadDropzone}
                      onClick={() => document.getElementById('evidenceFileInput')?.click()}
                      style={{ minHeight: '100px', borderStyle: 'dashed' }}
                    >
                      <input
                        type="file"
                        id="evidenceFileInput"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                      />
                      <span className={`material-symbols-outlined ${styles.uploadIcon}`} style={{ fontSize: '1.8rem' }}>cloud_upload</span>
                      <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#fff' }}>Chọn hình ảnh bằng chứng</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hỗ trợ nhiều ảnh PNG, JPG.</div>
                    </div>

                    {previewUrls.length > 0 && (
                      <div className={styles.uploadPreviewGrid}>
                        {previewUrls.map((url, index) => (
                          <div
                            key={index}
                            className={styles.uploadPreviewItem}
                            onClick={(e) => { e.stopPropagation(); setEnlargedImage(url); }}
                          >
                            <img src={url} alt={`Preview ${index}`} className={styles.uploadPreviewImg} />
                            <button
                              type="button"
                              className={styles.removePreviewBtn}
                              onClick={(e) => removeFile(e, index)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowDisputeModal(false)}
                  style={{ flex: 1, padding: '10px' }}
                >
                  HỦY
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', border: 'none' }}
                >
                  {isGameTheory ? 'BÀN GIAO THẤT BẠI' : 'GỬI KHIẾU NẠI'}
                </button>
              </div>
            </form>
          )}

          {disputeStep === 'uploading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', gap: '1rem', textAlign: 'center' }}>
              <div className={styles.spinner}></div>
              <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>Đang xử lý & tải lên IPFS...</p>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đang đẩy hình ảnh và biên soạn JSON metadata lên IPFS (Pinata Gateway).</span>
            </div>
          )}

          {disputeStep === 'submitting' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 0', gap: '1rem', textAlign: 'center' }}>
              <div className={styles.spinner}></div>
              <p style={{ color: '#fff', fontWeight: 'bold', margin: 0 }}>Đang khởi tạo tranh chấp on-chain...</p>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vui lòng duyệt giao dịch mở tranh chấp (openDispute) trên ví Metamask của bạn.</span>
            </div>
          )}

          {disputeStep === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem 0', gap: '1rem', textAlign: 'center' }}>
              <AlertCircle size={40} style={{ color: '#ef4444' }} />
              <p style={{ color: '#ef4444', fontWeight: 'bold', margin: 0 }}>Mở tranh chấp thất bại</p>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{disputeErrMsg}</span>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setDisputeStep('idle')}
                style={{ marginTop: '1rem', width: '120px' }}
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

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
    <Layout>
      <div className={styles.container}>

        {/* ROOM HEADER (Information 1) */}
        <div className={styles.roomHeader}>
          <div>
            <div className={styles.liveIndicator}>
              {!isEnded ? (
                <>
                  <span className={styles.pulsingDot}></span>
                  <span className={styles.liveText}>PHÒNG ĐẤU GIÁ TRỰC TIẾP</span>
                </>
              ) : (
                <span className={styles.endedText}>PHIÊN ĐẤU GIÁ ĐÃ KẾT THÚC</span>
              )}
              <span className={styles.roomNumber}>| Phiên đấu giá #{auction.auction_id}</span>
            </div>
            <h1 className={styles.title}>
              {auction.name || `Tác phẩm #${auction.nft_token_id}`}
            </h1>
          </div>

          {auction.asset_type === 'PHYSICAL' && (
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textAlign: 'right' }}>Cơ chế bảo vệ</span>
              <div className={styles.protectionBadge}>
                <Scale size={14} />
                <span>
                  {auction.dispute_type === 'GAME_THEORY_ESCROW' ? 'LÝ THUYẾT TRÒ CHƠI' : 'BỒI THẨM ĐOÀN'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* MAIN LAYOUT */}
        <div className={styles.mainLayout}>

          {/* LEFT COLUMN: NFT Preview, Countdown, Bidding Box */}
          <div className={styles.leftCol}>

            {/* NFTDetailPreview Component */}
            <div className={`glass-panel ${styles.previewWrapper}`}>
              <NFTDetailPreview nft={nftObj} />
            </div>

            {/* COUNTDOWN CLOCK */}
            <div className={`glass-panel ${styles.countdownCard}`}>
              <div className={styles.clockHeader}>
                <Clock size={14} />
                <span>Thời gian còn lại</span>
              </div>

              <div className={styles.timeGrid}>
                <div className={styles.timeBlock}>{timerData.hours}</div>
                <span className={styles.timeColon}>:</span>
                <div className={styles.timeBlock}>{timerData.minutes}</div>
                <span className={styles.timeColon}>:</span>
                <div className={styles.timeBlock}>{timerData.seconds}</div>
              </div>
            </div>

            {/* BIDDING CARD */}
            <div className={`glass-panel ${styles.bidCard}`}>
              <div className={styles.priceGrid}>
                <div className={styles.priceItem}>
                  <span className={styles.priceLabel}>Khởi điểm</span>
                  <span className={styles.priceValue}>{reservePrice.toFixed(2)} ADF</span>
                  {auction?.seller && (
                    <span className={styles.topBidderText}>
                      Bởi ví: {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
                    </span>
                  )}
                </div>
                <div className={`${styles.priceItem} ${styles.priceItemHighlight}`}>
                  <span className={styles.priceLabel}>{isEnded ? 'Chung cuộc' : 'Giá dẫn đầu'}</span>
                  <span className={`${styles.priceValue} ${styles.priceValueGold}`}>
                    {(currentBid > 0 ? currentBid : reservePrice).toFixed(2)} ADF
                  </span>
                  {currentBid > 0 && (
                    <span className={styles.topBidderText}>
                      Bởi ví: {auction.current_top_bidder?.slice(0, 6)}...{auction.current_top_bidder?.slice(-4)}
                    </span>
                  )}
                </div>
              </div>

              {!isEnded ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {step === 'success' && (
                    <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}>
                      🎉 Đặt giá thành công!
                    </div>
                  )}

                  {step === 'error' && (
                    <div style={{ color: '#ef4444', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center' }}>
                      ⚠️ Đấu giá thất bại: {bidError?.message || 'Đã xảy ra lỗi'}
                    </div>
                  )}

                  {/* Inline loading notifications */}
                  {step === 'approving_adf' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(242,202,80,0.05)', border: '1px solid rgba(242,202,80,0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div className={styles.spinner}></div>
                      <span>Vui lòng ký duyệt Approve hạn mức ADF trên ví Metamask...</span>
                    </div>
                  )}
                  {step === 'bidding' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <div className={styles.spinner}></div>
                      <span>Vui lòng ký duyệt lệnh thầu thầu on-chain trên ví Metamask...</span>
                    </div>
                  )}

                  <div className={styles.bidInputRow}>
                    <div className={styles.inputWrapper}>
                      <input
                        type="number"
                        className={styles.bidInput}
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        placeholder={minimumBid.toFixed(2)}
                        disabled={step === 'approving_adf' || step === 'bidding'}
                        min={minimumBid}
                        step="0.01"
                      />
                      <span className={styles.inputSuffix}>ADF</span>
                    </div>

                    <button
                      type="button"
                      className={styles.bidMinBtn}
                      onClick={() => setBidAmount(minimumBid.toFixed(2))}
                      disabled={step === 'approving_adf' || step === 'bidding'}
                    >
                      MIN
                    </button>

                    <button
                      className="btn btn-primary"
                      onClick={handlePlaceBid}
                      disabled={step === 'approving_adf' || step === 'bidding' || !isValidAmount || !hasEnoughBalance}
                    >
                      ĐẤU GIÁ
                    </button>
                  </div>

                  <div className={styles.bidHelpRow}>
                    <span className={styles.bidHelpText}>
                      <AlertTriangle size={12} color="#f59e0b" />
                      Bước nhảy tối thiểu: +{minIncrement.toFixed(2)} ADF (Nhập ≥ {minimumBid.toFixed(2)})
                    </span>
                    <span className={styles.balanceText}>
                      Số dư: <strong>{userBalance.toFixed(2)} ADF</strong>
                    </span>
                  </div>

                  {isGameTheory && (
                    <div style={{ padding: '10px', background: 'rgba(242, 202, 80, 0.05)', border: '1px solid rgba(242, 202, 80, 0.1)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <ShieldAlert size={14} className="text-gold" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        Yêu cầu cọc ký quỹ thêm <strong className="text-gold">{reservePrice} ADF</strong>.
                        Tổng số ADF cần có trong ví: <strong className="text-gold">{(inputAmount + buyerDepositFloat).toFixed(2)} ADF</strong>.
                        (Cọc sẽ được tự động hoàn lại nếu bạn bị ví khác outbid).
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                renderEscrowOrEndPanel()
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Technical onchain details, Live Chat Room */}
          <div className={styles.rightCol}>

            {/* TECHNICAL DETAILS */}
            <div className={`glass-panel ${styles.technicalCard}`}>
              <h4 className={styles.technicalTitle}>Thông tin kỹ thuật (On-chain)</h4>

              <div className={styles.technicalGrid}>
                <div className={styles.technicalItem}>
                  <span className={styles.technicalLabel}>Nhãn thuộc tính</span>
                  <div className={styles.badgeRow}>
                    <span className={styles.categoryBadge}>{auction.category_name || 'NFT'}</span>
                    <span className={styles.deliveryBadge}>
                      {auction.asset_type === 'PHYSICAL' ? 'Vật lý' : 'Kỹ thuật số'}
                    </span>
                  </div>
                </div>

                {auction.asset_type === 'PHYSICAL' && (
                  <>
                    <div className={styles.technicalItem}>
                      <span className={styles.technicalLabel}>Phương pháp bàn giao</span>
                      <span className={styles.technicalValue}>
                        {auction.dispute_type === 'GAME_THEORY_ESCROW' ? 'Cọc Lý thuyết trò chơi' : 'Biểu quyết Bồi thẩm đoàn'}
                      </span>
                    </div>

                    {(auction as any).location_province && (
                      <div className={styles.technicalItem}>
                        <span className={styles.technicalLabel}>Vị trí vật phẩm</span>
                        <span className={styles.technicalValue}>
                          {(auction as any).location_detail ? `${(auction as any).location_detail}, ` : ''}
                          {(auction as any).location_ward ? `${(auction as any).location_ward}, ` : ''}
                          {(auction as any).location_district ? `${(auction as any).location_district}, ` : ''}
                          {(auction as any).location_province}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className={styles.technicalItem}>
                  <span className={styles.technicalLabel}>Địa chỉ Hợp đồng</span>
                  <span className={`${styles.technicalValue} ${styles.valueMono}`}>
                    {CONTRACT_ADDRESSES.AuctionExchange.slice(0, 8)}...{CONTRACT_ADDRESSES.AuctionExchange.slice(-6)}
                  </span>
                </div>

                <div className={styles.technicalItem}>
                  <span className={styles.technicalLabel}>Token ID</span>
                  <span className={`${styles.technicalValue} ${styles.valueMono}`}>{auction.nft_token_id}</span>
                </div>

                <div className={styles.technicalItem}>
                  <span className={styles.technicalLabel}>Tiêu chuẩn mã hóa</span>
                  <span className={styles.technicalValue}>ERC-721</span>
                </div>

                <div className={styles.technicalItem}>
                  <span className={styles.technicalLabel}>Mạng lưới blockchain</span>
                  <span className={styles.technicalValue}>Sepolia</span> 
                </div>

                {auction.token_uri && (
                  <div className={styles.technicalItem}>
                    <span className={styles.technicalLabel}>Metadata IPFS</span>
                    <a
                      href={
                        auction.token_uri.startsWith('ipfs://')
                          ? `https://gold-keen-wildebeest-44.mypinata.cloud/ipfs/${auction.token_uri.replace('ipfs://', '')}`
                          : auction.token_uri
                      }
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

            {/* CHAT ROOM */}
            <div className={`glass-panel ${styles.chatBox}`}>
              <div className={styles.chatHeader}>
                <div className={styles.chatTitleContainer}>
                  <MessageSquare size={16} />
                  <h3 className={styles.chatTitle}>Kênh Thảo Luận Phiên</h3>
                </div>
                <span className={`${styles.chatStatus} ${!isSocketConnected ? styles.chatStatusDisconnected : ''}`}>
                  ● {isSocketConnected ? 'Đã kết nối WebSockets' : 'Mất kết nối'}
                </span>
              </div>

              {/* Message List */}
              <div className={styles.messagesList}>
                {chatMessages.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Chưa có tin nhắn nào. Hãy gửi phản hồi hoặc thảo luận về vật phẩm ở đây!
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
                <div ref={chatEndRef} />
              </div>

              {/* Chat Send Form */}
              <form onSubmit={handleSendChat} className={styles.chatInputForm}>
                <input
                  type="text"
                  className={styles.chatInput}
                  value={myMessage}
                  onChange={(e) => setMyMessage(e.target.value)}
                  placeholder={isConnected ? "Nhập tin nhắn..." : "Vui lòng kết nối ví để nhắn..."}
                  disabled={!isConnected || !isSocketConnected}
                />
                <button
                  type="submit"
                  className="btn btn-outline btn-sm styles.chatSendBtn"
                  disabled={!isConnected || !isSocketConnected || !myMessage.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '30px', padding: '0 16px' }}
                >
                  <span>Gửi</span>
                  <Send size={12} />
                </button>
              </form>
            </div>

          </div>

        </div>

      </div>
      {showDisputeModal && renderDisputeModal()}
      {enlargedImage && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', zIndex: 1100, padding: '20px'
          }}
          onClick={() => setEnlargedImage(null)}
        >
          <img
            src={enlargedImage}
            alt="Enlarged"
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px', border: '2px solid rgba(255,255,255,0.1)' }}
          />
        </div>
      )}
      {isConnected && (
        <FloatingWalletWidget
          balance={balance !== undefined ? balance : 0n}
          pendingReturns={pendingReturns !== undefined ? pendingReturns : 0n}
          onWithdraw={() => withdraw()}
          isWithdrawing={isWithdrawing}
          isWithdrawConfirming={isWithdrawConfirming}
          onDeposit={() => faucet()}
          isDepositing={isFauceting || isFaucetConfirming}
        />
      )}
    </Layout>
  );
};

export default Auction;
