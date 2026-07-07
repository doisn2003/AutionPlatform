import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseUnits } from 'viem';
import { useApproveNFT, useCreateAuction, useApproveADF } from '../../hooks/useContractActions';
import { useNFTApproved, useADFAllowance } from '../../hooks/useReadContract';
import { CONTRACT_ADDRESSES, API_URL } from '../../config/contracts';
import styles from './CreateAuctionModal.module.css';
import { useNFTImage } from '../../hooks/useNFTImage';
import CategorySelector from '../common/CategorySelector';
import type { AssetCategory } from '../common/CategorySelector';

interface CreateAuctionModalProps {
  nft: {
    token_id: number;
    name: string;
    image: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const CreateAuctionModal: React.FC<CreateAuctionModalProps> = ({ nft, onClose, onSuccess }) => {
  const { isConnected, address: userAddress } = useAccount();
  const { data: approvedAddress, refetch: refetchApproval } = useNFTApproved(BigInt(nft.token_id));
  const { data: adfAllowance, refetch: refetchAdfAllowance } = useADFAllowance(userAddress);
  const { imageUrl } = useNFTImage(nft.token_id, nft.image);

  const {
    approveNFT,
    isPending: isApprovingNft,
    isConfirming: isNftApproveConfirming,
    isConfirmed: isNftApproveConfirmed,
    error: approveError,
  } = useApproveNFT();

  const {
    approve: approveADF,
    isPending: isApprovingAdf,
    isConfirming: isAdfApproveConfirming,
    isConfirmed: isAdfApproveConfirmed,
    error: adfError,
  } = useApproveADF();

  const {
    createAuction,
    isPending: isCreating,
    isConfirming: isCreateConfirming,
    isConfirmed: isCreateConfirmed,
    error: createError,
  } = useCreateAuction();

  // Form states
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
  const [reservePrice, setReservePrice] = useState('10');
  const [minBidIncrement, setMinBidIncrement] = useState('1');
  const [duration, setDuration] = useState('5');
  const [durationUnit, setDurationUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  // Dispute Type state (1 = GAME_THEORY_ESCROW, 2 = JURY_VOTING)
  const [disputeType, setDisputeType] = useState<number>(1);

  // Location Selector states
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);

  const [selectedProvinceCode, setSelectedProvinceCode] = useState('');
  const [selectedDistrictCode, setSelectedDistrictCode] = useState('');
  const [selectedWardCode, setSelectedWardCode] = useState('');

  const [provinceName, setProvinceName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [wardName, setWardName] = useState('');
  const [detailAddress, setDetailAddress] = useState('');
  const [isLocationApiFailed, setIsLocationApiFailed] = useState(false);

  // Flow step state: 'form' | 'approving_nft' | 'approving_adf' | 'creating' | 'success' | 'error'
  const [step, setStep] = useState<'form' | 'approving_nft' | 'approving_adf' | 'creating' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch categories
  useEffect(() => {
    fetch(`${API_URL}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data && Array.isArray(data.data)) {
          setCategories(data.data);
        } else if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error("Failed to fetch categories:", err));
  }, []);

  // Fetch Provinces if Category is Physical
  useEffect(() => {
    if (selectedCategory?.asset_type === 'PHYSICAL' && provinces.length === 0) {
      fetch('https://provinces.open-api.vn/api/p/')
        .then(res => {
          if (!res.ok) throw new Error('Location API error');
          return res.json();
        })
        .then(data => {
          if (Array.isArray(data)) {
            setProvinces(data);
          }
        })
        .catch(err => {
          console.error("Failed to load provinces, falling back to manual text:", err);
          setIsLocationApiFailed(true);
        });
    }
  }, [selectedCategory, provinces.length]);

  // Clean up location values if switching category back to Digital
  useEffect(() => {
    if (selectedCategory?.asset_type !== 'PHYSICAL') {
      setSelectedProvinceCode('');
      setSelectedDistrictCode('');
      setSelectedWardCode('');
      setProvinceName('');
      setDistrictName('');
      setWardName('');
      setDetailAddress('');
    }
  }, [selectedCategory]);

  const handleProvinceChange = (code: string) => {
    setSelectedProvinceCode(code);
    setSelectedDistrictCode('');
    setSelectedWardCode('');
    setDistricts([]);
    setWards([]);

    const prov = provinces.find(p => p.code.toString() === code);
    setProvinceName(prov ? prov.name : '');
    setDistrictName('');
    setWardName('');

    if (code) {
      fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.districts)) {
            setDistricts(data.districts);
          }
        })
        .catch(err => {
          console.error("Failed to load districts:", err);
          setIsLocationApiFailed(true);
        });
    }
  };

  const handleDistrictChange = (code: string) => {
    setSelectedDistrictCode(code);
    setSelectedWardCode('');
    setWards([]);

    const dist = districts.find(d => d.code.toString() === code);
    setDistrictName(dist ? dist.name : '');
    setWardName('');

    if (code) {
      fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`)
        .then(res => res.json())
        .then(data => {
          if (data && Array.isArray(data.wards)) {
            setWards(data.wards);
          }
        })
        .catch(err => {
          console.error("Failed to load wards:", err);
          setIsLocationApiFailed(true);
        });
    }
  };

  const handleWardChange = (code: string) => {
    setSelectedWardCode(code);
    const wrd = wards.find(w => w.code.toString() === code);
    setWardName(wrd ? wrd.name : '');
  };

  // Check NFT approval
  const isApproved =
    approvedAddress?.toLowerCase() === CONTRACT_ADDRESSES.AuctionExchange.toLowerCase();

  // Check ADF approval
  const needsAdfApproval = selectedCategory?.asset_type === 'PHYSICAL' && disputeType === 1;
  const reservePriceWei = parseUnits(reservePrice || '0', 18);
  const isAdfApproved = !needsAdfApproval || (adfAllowance !== undefined && adfAllowance >= reservePriceWei);

  // Helper execution function
  const executeCreateAuction = () => {
    const durationSeconds = getDurationInSeconds();
    const minBidIncrementWei = parseUnits(minBidIncrement, 18);
    const assetType = selectedCategory?.asset_type === 'PHYSICAL' ? 1 : 0;
    const finalDisputeType = selectedCategory?.asset_type === 'PHYSICAL' ? disputeType : 0;
    const escrowDuration = selectedCategory?.asset_type === 'PHYSICAL' ? 7n * 86400n : 0n;

    createAuction(
      BigInt(nft.token_id),
      durationSeconds,
      reservePriceWei,
      minBidIncrementWei,
      assetType,
      finalDisputeType,
      escrowDuration
    );
  };

  // Automatic transition after NFT approval is confirmed
  useEffect(() => {
    if (isNftApproveConfirmed && step === 'approving_nft') {
      refetchApproval().then(() => {
        if (needsAdfApproval && !isAdfApproved) {
          setStep('approving_adf');
          approveADF(undefined, reservePriceWei);
        } else {
          setStep('creating');
          executeCreateAuction();
        }
      });
    }
  }, [isNftApproveConfirmed, step]);

  // Automatic transition after ADF approval is confirmed
  useEffect(() => {
    if (isAdfApproveConfirmed && step === 'approving_adf') {
      refetchAdfAllowance().then(() => {
        setStep('creating');
        executeCreateAuction();
      });
    }
  }, [isAdfApproveConfirmed, step]);

  // Transition to success state
  useEffect(() => {
    if (isCreateConfirmed) {
      setStep('success');

      // Đồng bộ category_code và địa chỉ lên off-chain database (có cơ chế tự động thử lại)
      if (selectedCategory) {
        const syncCategory = (retriesLeft = 6) => {
          const bodyPayload: any = {
            category_code: selectedCategory.category_code
          };

          if (selectedCategory.asset_type === 'PHYSICAL') {
            bodyPayload.location_province = provinceName;
            bodyPayload.location_district = districtName;
            bodyPayload.location_ward = wardName;
            bodyPayload.location_detail = detailAddress;
          }

          fetch(`${API_URL}/api/auctions/by-nft/${nft.token_id}/category`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload),
          })
            .then((res) => {
              if (!res.ok) {
                if (retriesLeft > 0) {
                  console.log(`[Sync] Phiên đấu giá chưa được lưu vào DB. Thử lại sau 1.5s... (Còn ${retriesLeft} lần thử)`);
                  setTimeout(() => syncCategory(retriesLeft - 1), 1500);
                } else {
                  console.error('[Sync] Quá số lần thử lại, không thể đồng bộ danh mục.');
                }
                return null;
              }
              return res.json();
            })
            .then((data) => {
              if (data) console.log('[Sync] Đồng bộ danh mục và địa điểm thành công:', data);
            })
            .catch((err) => {
              if (retriesLeft > 0) {
                setTimeout(() => syncCategory(retriesLeft - 1), 1500);
              } else {
                console.error('[Sync] Lỗi đồng bộ danh mục và địa điểm:', err);
              }
            });
        };

        // Kích hoạt đồng bộ lần đầu tiên
        syncCategory();
      }

      // Trigger success callback after 2 seconds to auto-close
      const timer = setTimeout(() => {
        onSuccess();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isCreateConfirmed, selectedCategory, nft.token_id, provinceName, districtName, wardName, detailAddress, onSuccess]);

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setStep('error');
      setErrorMessage(approveError.message || 'Lỗi xảy ra trong quá trình Approve NFT.');
    }
  }, [approveError]);

  useEffect(() => {
    if (adfError) {
      setStep('error');
      setErrorMessage(adfError.message || 'Lỗi xảy ra trong quá trình Approve cọc ADF.');
    }
  }, [adfError]);

  useEffect(() => {
    if (createError) {
      setStep('error');
      setErrorMessage(createError.message || 'Lỗi xảy ra trong quá trình Tạo đấu giá.');
    }
  }, [createError]);

  const getDurationInSeconds = (): bigint => {
    const val = BigInt(parseInt(duration) || 5);
    if (durationUnit === 'minutes') return val * 60n;
    if (durationUnit === 'hours') return val * 3600n;
    return val * 86400n;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) {
      alert('Vui lòng kết nối ví trước.');
      return;
    }

    if (!selectedCategory) {
      alert('Vui lòng chọn danh mục tài sản.');
      return;
    }

    // Kiểm tra thông tin địa chỉ nếu là hàng vật lý
    if (selectedCategory.asset_type === 'PHYSICAL') {
      if (!provinceName || !districtName || !wardName || !detailAddress) {
        alert('Vui lòng điền đầy đủ thông tin địa điểm giao nhận.');
        return;
      }
    }

    const durationSeconds = getDurationInSeconds();
    const minBidIncrementWei = parseUnits(minBidIncrement, 18);

    if (durationSeconds <= 0n) {
      alert('Thời gian đấu giá phải lớn hơn 0.');
      return;
    }
    if (reservePriceWei <= 0n) {
      alert('Giá khởi điểm phải lớn hơn 0.');
      return;
    }

    if (!isApproved) {
      setStep('approving_nft');
      approveNFT(BigInt(nft.token_id));
    } else if (needsAdfApproval && !isAdfApproved) {
      setStep('approving_adf');
      approveADF(undefined, reservePriceWei);
    } else {
      setStep('creating');
      executeCreateAuction();
    }
  };

  const applyPreset = (dur: string, unit: 'minutes' | 'hours' | 'days') => {
    setDuration(dur);
    setDurationUnit(unit);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`glass-panel gold-border ${styles.modal}`} style={{ maxWidth: '700px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Tạo Phiên Đấu Giá</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* NFT Details */}
        <div className={styles.nftOverview}>
          {imageUrl ? (
            <img src={imageUrl} alt={nft.name} className={styles.nftThumb} />
          ) : (
            <div className={styles.placeholderThumb}>
              <span className="material-symbols-outlined">image_not_supported</span>
              <span>Không có ảnh</span>
            </div>
          )}
          <div className={styles.nftMeta}>
            <span className={styles.nftName}>{nft.name || `Vật phẩm #${nft.token_id}`}</span>
            <span className={styles.nftId}>Token ID: {nft.token_id}</span>
          </div>
        </div>

        {step === 'form' && (
          <form onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Phân loại tài sản <span className="text-gold">*</span></label>
              <div style={{ marginTop: '8px' }}>
                <CategorySelector
                  categories={categories}
                  selectedCategoryCode={selectedCategory?.category_code || ''}
                  onSelect={setSelectedCategory}
                />
              </div>
            </div>

            {/* Starting price & Min bid increment on the same row */}
            <div className={styles.row}>
              <div className={styles.col}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Giá đấu khởi điểm <span className="text-gold">*</span></label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={styles.input}
                      value={reservePrice}
                      onChange={(e) => setReservePrice(e.target.value)}
                      required
                    />
                    <span className={styles.inputSuffix}>ADF</span>
                  </div>
                </div>
              </div>

              <div className={styles.col}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Bước giá tối thiểu <span className="text-gold">*</span></label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={styles.input}
                      value={minBidIncrement}
                      onChange={(e) => setMinBidIncrement(e.target.value)}
                      required
                    />
                    <span className={styles.inputSuffix}>ADF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dispute Resolution Selection (Physical Assets Only) */}
            {selectedCategory?.asset_type === 'PHYSICAL' && (
              <div className={styles.formGroup}>
                <label className={styles.label}>Phương pháp giải quyết tranh chấp <span className="text-gold">*</span></label>
                <div className={styles.disputeSelectRow}>
                  <button
                    type="button"
                    className={`${styles.disputeCard} ${disputeType === 1 ? styles.disputeCardActive : ''}`}
                    onClick={() => setDisputeType(1)}
                  >
                    <span className="material-symbols-outlined">gavel</span>
                    <div className={styles.disputeCardMeta}>
                      <span className={styles.disputeCardTitle}>Lý thuyết trò chơi</span>
                      <span className={styles.disputeCardDesc}>Hai bên cọc tiền tự răn đe</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className={`${styles.disputeCard} ${disputeType === 2 ? styles.disputeCardActive : ''}`}
                    onClick={() => setDisputeType(2)}
                  >
                    <span className="material-symbols-outlined">groups</span>
                    <div className={styles.disputeCardMeta}>
                      <span className={styles.disputeCardTitle}>Bồi thẩm đoàn</span>
                      <span className={styles.disputeCardDesc}>Cộng đồng bỏ phiếu phân định</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Vietnam Location Selector (Physical Assets Only) */}
            {selectedCategory?.asset_type === 'PHYSICAL' && (
              <div className={styles.locationSection}>
                <h4 className={styles.sectionTitle}>Địa chỉ vật phẩm</h4>

                {isLocationApiFailed ? (
                  /* Fallback to manual text input if API fails */
                  <>
                    <div className={styles.row}>
                      <div className={styles.col}>
                        <label className={styles.label}>Tỉnh / Thành phố <span className="text-gold">*</span></label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ví dụ: Hà Nội"
                          value={provinceName}
                          onChange={(e) => setProvinceName(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.col}>
                        <label className={styles.label}>Quận / Huyện <span className="text-gold">*</span></label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ví dụ: Cầu Giấy"
                          value={districtName}
                          onChange={(e) => setDistrictName(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.row}>
                      <div className={styles.col}>
                        <label className={styles.label}>Phường / Xã <span className="text-gold">*</span></label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ví dụ: Dịch Vọng"
                          value={wardName}
                          onChange={(e) => setWardName(e.target.value)}
                          required
                        />
                      </div>
                      <div className={styles.col}>
                        <label className={styles.label}>Địa chỉ chi tiết (số nhà, tên đường...) <span className="text-gold">*</span></label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ví dụ: 144 Xuân Thủy"
                          value={detailAddress}
                          onChange={(e) => setDetailAddress(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  /* Standard Select Dropdowns using open-api.vn */
                  <>
                    <div className={styles.row}>
                      <div className={styles.col}>
                        <label className={styles.label}>Tỉnh / Thành phố <span className="text-gold">*</span></label>
                        <select
                          className={styles.select}
                          value={selectedProvinceCode}
                          onChange={(e) => handleProvinceChange(e.target.value)}
                          required
                        >
                          <option value="">Chọn Tỉnh / Thành phố</option>
                          {provinces.map(p => (
                            <option key={p.code} value={p.code}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.col}>
                        <label className={styles.label}>Quận / Huyện <span className="text-gold">*</span></label>
                        <select
                          className={styles.select}
                          value={selectedDistrictCode}
                          onChange={(e) => handleDistrictChange(e.target.value)}
                          disabled={!selectedProvinceCode}
                          required
                        >
                          <option value="">Chọn Quận / Huyện</option>
                          {districts.map(d => (
                            <option key={d.code} value={d.code}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={styles.row}>
                      <div className={styles.col}>
                        <label className={styles.label}>Phường / Xã <span className="text-gold">*</span></label>
                        <select
                          className={styles.select}
                          value={selectedWardCode}
                          onChange={(e) => handleWardChange(e.target.value)}
                          disabled={!selectedDistrictCode}
                          required
                        >
                          <option value="">Chọn Phường / Xã</option>
                          {wards.map(w => (
                            <option key={w.code} value={w.code}>{w.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className={styles.col}>
                        <label className={styles.label}>Địa chỉ chi tiết (số nhà, tên đường...) <span className="text-gold">*</span></label>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="Ví dụ: 144 Xuân Thủy"
                          value={detailAddress}
                          onChange={(e) => setDetailAddress(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.label}>Thời lượng đấu giá <span className="text-gold">*</span></label>
              <div className={styles.durationRow}>
                <input
                  type="number"
                  min="1"
                  className={styles.input}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                  style={{ flex: 1 }}
                />
                <select
                  className={styles.durationSelect}
                  value={durationUnit}
                  onChange={(e: any) => setDurationUnit(e.target.value)}
                >
                  <option value="minutes">Phút</option>
                  <option value="hours">Giờ</option>
                  <option value="days">Ngày</option>
                </select>
              </div>

              {/* Presets */}
              <div className={styles.presetContainer}>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('5', 'minutes')}>5 phút (Test)</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('1', 'hours')}>1 giờ</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('1', 'days')}>1 ngày</button>
                <button type="button" className={styles.presetBtn} onClick={() => applyPreset('3', 'days')}>3 ngày</button>
              </div>
            </div>

            {/* Dynamic Step indicators */}
            <div className={styles.stepContainer}>
              {/* Step 1: NFT Approval */}
              <div className={`${styles.stepRow} ${isApproved ? styles.stepCompleted : styles.stepActive}`}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>Bước 1: Chấp thuận (Approve) NFT</span>
                  <span className={styles.stepDesc}>Ủy quyền cho hợp đồng sàn đấu giá giữ vật phẩm</span>
                </div>
                {isApproved ? (
                  <span className="material-symbols-outlined text-gold">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>pending</span>
                )}
              </div>

              {/* Step 2: ADF Approval (Only for Game Theory Escrow) */}
              {needsAdfApproval && (
                <div className={`${styles.stepRow} ${isAdfApproved ? styles.stepCompleted : isApproved ? styles.stepActive : ''}`}>
                  <div className={styles.stepInfo}>
                    <span className={styles.stepTitle}>Bước 2: Ký quỹ cọc (Approve) ADF</span>
                    <span className={styles.stepDesc}>Chấp thuận cọc số tiền tương đương Giá khởi điểm ({reservePrice} ADF)</span>
                  </div>
                  {isAdfApproved ? (
                    <span className="material-symbols-outlined text-gold">check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>pending</span>
                  )}
                </div>
              )}

              {/* Step 3 or 2: Create Auction */}
              <div className={`${styles.stepRow} ${(isApproved && isAdfApproved) ? styles.stepActive : ''}`}>
                <div className={styles.stepInfo}>
                  <span className={styles.stepTitle}>Bước {needsAdfApproval ? 3 : 2}: Khởi tạo đấu giá</span>
                  <span className={styles.stepDesc}>Gửi giao dịch niêm yết đấu giá chính thức lên Blockchain</span>
                </div>
                <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)' }}>lock</span>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              <button type="submit" className="btn btn-gradient w-full" style={{ padding: '14px' }}>
                {!isApproved
                  ? 'Chấp thuận NFT & Tạo đấu giá'
                  : (needsAdfApproval && !isAdfApproved)
                    ? 'Chấp thuận cọc ADF & Tạo đấu giá'
                    : 'Bắt đầu đấu giá'}
              </button>
            </div>
          </form>
        )}

        {step === 'approving_nft' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p style={{ fontWeight: 600 }}>
              {isApprovingNft
                ? 'Đang gửi lệnh Approve NFT...'
                : isNftApproveConfirming
                  ? 'Đang xác nhận lệnh Approve NFT...'
                  : 'Đang chuẩn bị...'}
            </p>
            <span className={styles.statusHint}>
              Vui lòng duyệt trên ví Metamask để sàn có quyền giữ NFT của bạn.
            </span>
          </div>
        )}

        {step === 'approving_adf' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p style={{ fontWeight: 600 }}>
              {isApprovingAdf
                ? 'Đang gửi lệnh Approve cọc ADF...'
                : isAdfApproveConfirming
                  ? 'Đang xác nhận lệnh Approve cọc...'
                  : 'Đang chuẩn bị...'}
            </p>
            <span className={styles.statusHint}>
              Vui lòng duyệt giao dịch ký quỹ cọc ADF ({reservePrice} ADF) trên ví Metamask.
            </span>
          </div>
        )}

        {step === 'creating' && (
          <div className={styles.statusBlock}>
            <div className={styles.spinner}></div>
            <p style={{ fontWeight: 600 }}>
              {isCreating
                ? 'Đang gửi lệnh Tạo đấu giá...'
                : isCreateConfirming
                  ? 'Đang xác nhận giao dịch trên blockchain...'
                  : 'Đang gửi...'}
            </p>
            <span className={styles.statusHint}>
              Đang thực hiện giao dịch khởi tạo phiên đấu giá chính thức.
            </span>
          </div>
        )}

        {step === 'success' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#10b981' }}>check_circle</span>
            <p style={{ color: '#10b981', fontWeight: 600 }}>Tạo đấu giá thành công!</p>
            <span className={styles.statusHint}>
              Vật phẩm của bạn đã được niêm yết. Trang sẽ tự động làm mới...
            </span>
            <button className="btn btn-outline" onClick={onSuccess} style={{ marginTop: '16px' }}>Đóng</button>
          </div>
        )}

        {step === 'error' && (
          <div className={styles.statusBlock}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: '#ef4444' }}>error</span>
            <p style={{ color: '#ef4444', fontWeight: 600 }}>Giao dịch thất bại</p>
            <span className={styles.statusHint}>{errorMessage}</span>
            <button className="btn btn-outline" onClick={() => setStep('form')} style={{ marginTop: '16px' }}>Thử lại</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAuctionModal;
