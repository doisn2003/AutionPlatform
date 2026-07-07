// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAuctionExchange {
    function releaseEscrowToBuyer(uint256 auctionId) external;
    function releaseEscrowToSeller(uint256 auctionId) external;
    function burnGameTheoryDeposits(uint256 auctionId) external;
    function getAuctionInfo(uint256 auctionId) external view returns (
        address seller, address buyer, uint256 currentTopBid, uint8 disputeType
    );
}

interface IADF_Pool {
    function withdrawJurorReward(uint256 amount) external;
    function reserveADF() external view returns (uint256);
}

contract DisputeResolution is ReentrancyGuard, Ownable {
    IERC20 public adfToken;
    IAuctionExchange public auctionExchange;
    IADF_Pool public adfPool;
    address public serverOracle;

    // ====== HẰNG SỐ ======
    uint256 public constant MIN_JUROR_STAKE = 500 * 1e18;    // 500 ADF tối thiểu
    uint256 public constant JUROR_REWARD = 50 * 1e18;        // 50 ADF thưởng
    uint256 public constant JUROR_PENALTY = 100 * 1e18;      // 100 ADF phạt
    uint256 public constant NUM_JURORS = 5;                   // 5 jurors

    // ====== THỜI GIAN CÁC PHA (Có thể cấu hình phục vụ demo) ======
    uint256 public evidenceDuration = 3 days;
    uint256 public commitDuration = 2 days;
    uint256 public revealDuration = 1 days;

    // ====== BIẾN TRẠNG THÁI ======
    mapping(address => uint256) public jurorStakes;           // Số ADF đã stake của mỗi juror

    // ====== CẤU TRÚC TRANH CHẤP ======
    enum DisputePhase {
        EVIDENCE,     // Thu thập bằng chứng (mặc định 3 ngày)
        COMMIT,       // Jurors commit hash phiếu bí mật (mặc định 2 ngày)
        REVEAL,       // Jurors reveal phiếu thực (mặc định 1 ngày)
        RESOLVED      // Đã kết thúc
    }

    struct Dispute {
        uint256 auctionId;
        address buyer;
        address seller;
        address initiator;           // Ai mở tranh chấp
        
        string buyerEvidenceIPFS;    // Bằng chứng buyer
        string sellerEvidenceIPFS;   // Bằng chứng seller
        
        address[5] selectedJurors;   // Top 5 jurors (set bởi server)
        bytes32[5] commitHashes;     // Hash của phiếu bầu
        uint8[5] revealedVotes;      // 0=chưa/abstain, 1=buyer thắng, 2=seller thắng
        bool[5] hasCommitted;
        bool[5] hasRevealed;
        
        DisputePhase phase;
        uint256 evidenceDeadline;    // Hạn nộp bằng chứng
        uint256 commitDeadline;      // Hạn commit phiếu
        uint256 revealDeadline;      // Hạn reveal phiếu
        
        uint8 buyerVotes;            // Số phiếu cho buyer
        uint8 sellerVotes;           // Số phiếu cho seller
        uint8 abstainCount;          // Số juror abstain
        bool resolved;
    }

    uint256 public disputeIdCounter;
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256) public auctionToDispute; // auctionId -> disputeId

    // ====== SỰ KIỆN ======
    event JurorStaked(address indexed juror, uint256 amount);
    event JurorUnstaked(address indexed juror, uint256 amount);
    event DisputeCreated(uint256 indexed disputeId, uint256 auctionId, address initiator);
    event JurorsAssigned(uint256 indexed disputeId, address[5] jurors);
    event EvidenceSubmitted(uint256 indexed disputeId, address indexed party, string evidenceIPFS);
    event PhaseAdvanced(uint256 indexed disputeId, DisputePhase newPhase);
    event DurationsUpdated(uint256 evidence, uint256 commit, uint256 reveal);
    event VoteCommitted(uint256 indexed disputeId, address indexed juror, bytes32 commitHash);
    event VoteRevealed(uint256 indexed disputeId, address indexed juror, uint8 vote);
    event DisputeResolved(
        uint256 indexed disputeId, 
        address winner, 
        uint8 buyerVotes, 
        uint8 sellerVotes, 
        uint8 abstainCount
    );
    event JurorRewarded(address indexed juror, uint256 amount);
    event JurorPenalized(address indexed juror, uint256 amount);

    constructor(address _adfToken) Ownable(msg.sender) {
        adfToken = IERC20(_adfToken);
    }

    /// @notice Thiết lập địa chỉ AuctionExchange contract
    function setAuctionExchange(address _auctionExchange) external onlyOwner {
        require(_auctionExchange != address(0), "Invalid address");
        auctionExchange = IAuctionExchange(_auctionExchange);
    }

    /// @notice Thiết lập địa chỉ serverOracle
    function setServerOracle(address _serverOracle) external onlyOwner {
        require(_serverOracle != address(0), "Invalid address");
        serverOracle = _serverOracle;
    }

    /// @notice Thiết lập địa chỉ AMM Pool contract
    function setAdfPool(address _adfPool) external onlyOwner {
        require(_adfPool != address(0), "Invalid address");
        adfPool = IADF_Pool(_adfPool);
    }

    /// @notice Thiết lập thời hạn của các pha (chủ yếu phục vụ demo hoặc điều chỉnh sau này)
    function setDurations(uint256 _evidence, uint256 _commit, uint256 _reveal) external onlyOwner {
        evidenceDuration = _evidence;
        commitDuration = _commit;
        revealDuration = _reveal;
        emit DurationsUpdated(_evidence, _commit, _reveal);
    }

    /// @notice Stake ADF để đủ điều kiện làm Juror
    function stakeForJuror(uint256 amount) external nonReentrant {
        require(amount >= MIN_JUROR_STAKE, "Must stake >= 500 ADF");
        require(adfToken.transferFrom(msg.sender, address(this), amount), "Stake failed");
        jurorStakes[msg.sender] += amount;
        emit JurorStaked(msg.sender, amount);
    }

    /// @notice Rút ADF đã stake
    function unstakeJuror(uint256 amount) external nonReentrant {
        require(amount <= jurorStakes[msg.sender], "Insufficient stake");
        // TODO: Kiểm tra juror không đang xử lý dispute nào (chừa chỗ cho phần sau nâng cấp)
        jurorStakes[msg.sender] -= amount;
        require(adfToken.transfer(msg.sender, amount), "Transfer failed");
        emit JurorUnstaked(msg.sender, amount);
    }

    /// @notice Tạo phiên tranh chấp mới
    /// @dev Chỉ cho phép AuctionExchange gọi khi mở tranh chấp
    function createDispute(
        uint256 _auctionId,
        address _buyer,
        address _seller,
        address _initiator,
        string calldata _evidenceIPFS,
        uint8 /*_disputeType*/
    ) external {
        // Chỉ cho phép AuctionExchange gọi hàm này
        require(msg.sender == address(auctionExchange), "Only AuctionExchange");

        // Khởi tạo dispute mới
        disputeIdCounter++;
        uint256 disputeId = disputeIdCounter;

        Dispute storage dispute = disputes[disputeId];
        dispute.auctionId = _auctionId;
        dispute.buyer = _buyer;
        dispute.seller = _seller;
        dispute.initiator = _initiator;
        dispute.phase = DisputePhase.EVIDENCE;

        // Biến cấu hình thời gian (Phục vụ demo)
        dispute.evidenceDeadline = block.timestamp + evidenceDuration;
        
        // Lưu bằng chứng ban đầu vào buyerEvidenceIPFS hoặc sellerEvidenceIPFS dựa trên initiator
        if (_initiator == _buyer) {
            dispute.buyerEvidenceIPFS = _evidenceIPFS;
        } else {
            dispute.sellerEvidenceIPFS = _evidenceIPFS;
        }

        auctionToDispute[_auctionId] = disputeId;
        emit DisputeCreated(disputeId, _auctionId, _initiator);
    }

    /// @notice Nộp thêm bằng chứng trong pha EVIDENCE
    function submitEvidence(uint256 _disputeId, string calldata _evidenceIPFS) external {
        Dispute storage dispute = disputes[_disputeId];
    
        // 1. Đảm bảo người gọi (msg.sender) là buyer hoặc seller của vụ tranh chấp
        require(msg.sender == dispute.buyer || msg.sender == dispute.seller, "Not a party");
        
        // 2. Đảm bảo tranh chấp đang ở pha EVIDENCE và chưa hết hạn evidenceDeadline
        require(dispute.phase == DisputePhase.EVIDENCE, "Wrong phase");
        require(block.timestamp <= dispute.evidenceDeadline, "Evidence deadline passed");
        
        // 3. Lưu bằng chứng: nếu người gọi là buyer thì gán vào buyerEvidenceIPFS, nếu là seller thì gán vào sellerEvidenceIPFS
        if (msg.sender == dispute.buyer) {
            dispute.buyerEvidenceIPFS = _evidenceIPFS;
        } else {
            dispute.sellerEvidenceIPFS = _evidenceIPFS;
        }
        
        // 4. Phát sự kiện
        emit EvidenceSubmitted(_disputeId, msg.sender, _evidenceIPFS);
    }

    /// @notice Chỉ định danh sách 5 ví trọng tài (Jurors)
    /// @dev Chỉ cho phép serverOracle gọi
    function setJurors(uint256 _disputeId, address[5] calldata _jurors) external {
        // 1. Bảo mật: Chỉ cho phép serverOracle gọi hàm này
        require(msg.sender == serverOracle, "Only server oracle");
        
        // 2. Đảm bảo tranh chấp đang ở pha EVIDENCE
        Dispute storage dispute = disputes[_disputeId];
        require(dispute.phase == DisputePhase.EVIDENCE, "Wrong phase");
        
        // 3. Kiểm tra và gán từng trọng tài:
        // - Không được trùng với buyer hoặc seller của tranh chấp
        // - Phải stake đủ lượng tối thiểu MIN_JUROR_STAKE
        // - Gán vào selectedJurors[i]
        for (uint8 i = 0; i < NUM_JURORS; i++) {
            require(_jurors[i] != dispute.buyer && _jurors[i] != dispute.seller, "Juror conflict");
            require(jurorStakes[_jurors[i]] >= MIN_JUROR_STAKE, "Juror insufficient stake");
            dispute.selectedJurors[i] = _jurors[i];
        }
        
        // 4. Chuyển pha tranh chấp sang COMMIT (DisputePhase.COMMIT)
        dispute.phase = DisputePhase.COMMIT;
        
        // SỬ DỤNG BIẾN CẤU HÌNH THỜI GIAN thay vì 2 ngày cứng
        dispute.commitDeadline = block.timestamp + commitDuration;
        
        // 5. Emit sự kiện JurorsAssigned và PhaseAdvanced
        emit JurorsAssigned(_disputeId, _jurors);
        emit PhaseAdvanced(_disputeId, DisputePhase.COMMIT);
    }

    /// @notice Tự động cập nhật pha dựa trên mốc thời gian hết hạn
    function checkAndUpdatePhase(uint256 _disputeId) public {
        Dispute storage dispute = disputes[_disputeId];
        
        // Kiểm tra nếu đang ở pha COMMIT và đã hết hạn commitDeadline, tự động chuyển pha sang REVEAL
        if (dispute.phase == DisputePhase.COMMIT && block.timestamp > dispute.commitDeadline) {
            dispute.phase = DisputePhase.REVEAL;
            dispute.revealDeadline = block.timestamp + revealDuration;
            emit PhaseAdvanced(_disputeId, DisputePhase.REVEAL);
        }
    }

    /// @notice Juror tiến hành gửi hash phiếu biểu quyết bí mật
    function commitVote(uint256 _disputeId, bytes32 _commitHash) external {
        // 1. Tự động kiểm tra cập nhật pha theo thời gian
        checkAndUpdatePhase(_disputeId);

        Dispute storage dispute = disputes[_disputeId];

        // 2. Đảm bảo trnah chấp đang ở phase commit
        require(dispute.phase == DisputePhase.COMMIT, "Wrong phase");

        // 3. Xác định jurorIndex của người gọi (nếu khôgn phải juror sẽ tự động revert)
        uint8 jurorIndex = getJurorIndex(_disputeId, msg.sender);
        require(!dispute.hasCommitted[jurorIndex], "Already committed");

        // 4. Lưu hash và đánh dấu đã commit
        dispute.commitHashes[jurorIndex] = _commitHash;
        dispute.hasCommitted[jurorIndex] = true;

        emit VoteCommitted(_disputeId, msg.sender, _commitHash);

        // 5. Tự động chuyển pha sang REVEAL nếu cả 5 trọng tài đều đã commit xong trước thời hạn
        uint8 commitCount = 0;
        for (uint8 i = 0; i < NUM_JURORS; i++) {
            if (dispute.hasCommitted[i]) {
                commitCount++;
            }
        }
        
        if (commitCount == NUM_JURORS) {
            dispute.phase = DisputePhase.REVEAL;
            dispute.revealDeadline = block.timestamp + revealDuration;
            emit PhaseAdvanced(_disputeId, DisputePhase.REVEAL);
        }
    }

    /// @notice Juror tiến hành mở phiếu biểu quyết
    function revealVote(uint256 _disputeId, uint8 _vote, string calldata _salt) external {
        // 1. Tu động kiểm tra cập nhật pha theo thời gian
        checkAndUpdatePhase(_disputeId);

        Dispute storage dispute = disputes[_disputeId];

        // 2. Đang ở pha REVEAL của tranh chấp và chưa hết hạn reveal
        require(dispute.phase == DisputePhase.REVEAL, "Wrong phase");
        require(block.timestamp <= dispute.revealDeadline, "Reveal deadline passed");

        // 3. Xác định jurorIndex của người gọi
        uint8 jurorIndex = getJurorIndex(_disputeId, msg.sender);

        // 4. Đảm bảo trọng tài đã commit ở pha trước và chưa từng reveal ở pha này
        require(dispute.hasCommitted[jurorIndex], "Not committed");
        require(!dispute.hasRevealed[jurorIndex], "Already revealed");

        // 5. Hợp lệ <=> 1 == buyer thắng, 2 == Seller thắng
        require(_vote == 1 || _vote == 2, "Invalid vote");

        // 6. Tính toán lại hash và đối chiếu
        bytes32 calculatedHash = keccak256(abi.encodePacked(_vote, _salt));
        require(calculatedHash == dispute.commitHashes[jurorIndex], "Hash mismatch");

        // 7. Ghi nhận kết quả và cập nhật tổng số phiếu bầu
        dispute.revealedVotes[jurorIndex] = _vote;
        dispute.hasRevealed[jurorIndex] = true;

        if (_vote == 1) {
            dispute.buyerVotes++;
        } else {
            dispute.sellerVotes++;
        }

        emit VoteRevealed(_disputeId, msg.sender, _vote);
    }

    /// @notice Kết thúc tranh chấp - phân xử kết quả và phân phối thưởng phạt cho Trọng tài
    function resolveDispute(uint256 _disputeId) external nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        
        require(dispute.phase == DisputePhase.REVEAL, "Wrong phase");
        require(!dispute.resolved, "Already resolved");

        // Kiểm tra xem tất cả trọng tài đã commit có đều đã reveal chưa
        uint8 commitCount = 0;
        uint8 revealCount = 0;
        for (uint8 i = 0; i < NUM_JURORS; i++) {
            if (dispute.hasCommitted[i]) {
                commitCount++;
                if (dispute.hasRevealed[i]) {
                    revealCount++;
                }
            }
        }

        // Nếu chưa giải mã đủ số lượng đã commit, bắt buộc phải đợi hết hạn revealDeadline
        if (revealCount < commitCount) {
            require(block.timestamp > dispute.revealDeadline, "Reveal not ended");
        }
        
        // 2. Đếm số Trọng tài không commit/reveal (Abstain)
        for (uint8 i = 0; i < NUM_JURORS; i++) {
            if (!dispute.hasRevealed[i]) {
                dispute.abstainCount++;
            }
        }
        
        // 3. Xác định kết quả thắng cuộc:
        bool buyerWins;
        if(dispute.buyerVotes == 0 && dispute.sellerVotes == 0) {
            // Tất cả Trọng tài đều bỏ phiếu trắng -> Mặc định Buyer thắng để bảo toàn tiền
            buyerWins = true;
        } else {
            buyerWins = dispute.buyerVotes > dispute.sellerVotes;
        }

        // 4. Tính toán thưởng / phạt của juror
        uint256 totalReward = 0;
        for(uint8 i = 0; i < NUM_JURORS; i++) {
            address juror = dispute.selectedJurors[i];

            // Không vote (abstain) => Không thưởng / Không phạt
            if(!dispute.hasRevealed[i]) {
                continue;
            }

            bool voteCorrectly = (buyerWins && dispute.revealedVotes[i] == 1) || (!buyerWins && dispute.revealedVotes[i] == 2);
            if(voteCorrectly) {
                totalReward += JUROR_REWARD;
                emit JurorRewarded(juror, JUROR_REWARD);
            } else {
                // Phạt trừ JUROR_PENALTY (100 ADF) khỏi stake. Nếu stake ít hơn 100 thì trừ sạch.
                uint256 penalty = JUROR_PENALTY > jurorStakes[juror] ? jurorStakes[juror] : JUROR_PENALTY;
                jurorStakes[juror] -= penalty;

                // Chuyển tiền phạt của trọng tài sai về Pool AMM
                require(adfToken.transfer(address(adfPool), penalty), "Penalty transfer failed");
                emit JurorPenalized(juror, penalty);
            }
        }

        // 5. Rút tiền thưởng cho juror từ pool AMM --> tặng cho juror đúng
        if(totalReward > 0 && address(adfPool) != address(0) && adfPool.reserveADF() >= totalReward) {
            adfPool.withdrawJurorReward(totalReward);
            for (uint8 i = 0; i < NUM_JURORS; i++) {
                if (dispute.hasRevealed[i]) {
                    bool correct = (buyerWins && dispute.revealedVotes[i] == 1) || 
                                (!buyerWins && dispute.revealedVotes[i] == 2);
                    if (correct) {
                        jurorStakes[dispute.selectedJurors[i]] += JUROR_REWARD;
                    }
                }
            }
        } 

        // 6. Callback giải phóng ký quỹ về cho bên thắng trên AuctionExchange
        if(buyerWins) {
            auctionExchange.releaseEscrowToBuyer(dispute.auctionId);
        } else {
            auctionExchange.releaseEscrowToSeller(dispute.auctionId);
        }
        
        // 7. Cập nhật trạng thái và phát sự kiện kết thúc
        dispute.phase = DisputePhase.RESOLVED;
        dispute.resolved = true;
        emit DisputeResolved(
            _disputeId,
            buyerWins ? dispute.buyer : dispute.seller,
            dispute.buyerVotes,
            dispute.sellerVotes,
            dispute.abstainCount
        );


    }

    /// @notice Thực thi cơ chế đốt cọc của Lý thuyết trò chơi (Game Theory Escrow)
    /// @dev Có thể được gọi bởi buyer hoặc seller của phiên tranh chấp
    function triggerGameTheoryBurn(uint256 _disputeId) external {
        Dispute storage dispute = disputes[_disputeId];
        require(!dispute.resolved, "Already resolved");
        
        // Đảm bảo người gọi là buyer hoặc seller của tranh chấp
        require(msg.sender == dispute.buyer || msg.sender == dispute.seller, "Not a party");
        
        dispute.resolved = true;
        dispute.phase = DisputePhase.RESOLVED;
        
        // Gọi AuctionExchange thực hiện đốt cọc & trả NFT
        auctionExchange.burnGameTheoryDeposits(dispute.auctionId);
        
        emit DisputeResolved(
            _disputeId,
            address(0),
            0,
            0,
            0
        );
    }

    // Helper kiểm tra ví trong danh sách trọng tài
    function getJurorIndex(uint256 _disputeId, address _juror) public view returns (uint8) {
        Dispute storage dispute = disputes[_disputeId];
        for (uint8 i = 0; i < NUM_JURORS; i++) {
            if (dispute.selectedJurors[i] == _juror) {
                return i;
            }
        }
        revert("Not selected juror");
    }

    /// @notice Lấy thông tin chi tiết trạng thái bỏ phiếu của một Trọng tài
    function getDisputeJurorInfo(uint256 _disputeId, address _juror) external view returns (
        bool hasCommitted,
        bool hasRevealed,
        bytes32 commitHash,
        uint8 revealedVote
    ) {
        Dispute storage dispute = disputes[_disputeId];
        uint8 index = getJurorIndex(_disputeId, _juror);
        return (
            dispute.hasCommitted[index],
            dispute.hasRevealed[index],
            dispute.commitHashes[index],
            dispute.revealedVotes[index]
        );
    }
}
