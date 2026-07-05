//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface IDisputeResolution {
    function createDispute(
        uint256 _auctionId,
        address _buyer,
        address _seller,
        address _initiator,
        string calldata _evidenceIPFS,
        uint8 _disputeType
    ) external;
}

contract AuctionExchange is ReentrancyGuard, Ownable {
    IERC20 public adfToken;
    IERC721 public adfNFT;
    address public disputeContract;

    enum AssetType {
        DIGITAL,
        PHYSICAL
    }

    enum DisputeType {
        NONE,
        GAME_THEORY_ESCROW,
        JURY_VOTING
    }

    enum AuctionPhase {
        BIDDING,
        ESCROW_HOLDING,
        DELIVERED,
        DISPUTE_OPENED,
        RESOLVED,
        CANCELED
    }

    // thong tin cua mot phien dau gia
    struct Auction {
        address seller;
        uint256 nftTokenId;
        uint256 endTime;
        uint256 reservePrice;
        uint256 minBidIncrement;
        address currentTopBidder;
        uint256 currentTopBid;
        bool active;
        
        // Danh mục & Escrow
        AssetType assetType;
        DisputeType disputeType;
        AuctionPhase phase;
        uint256 escrowDeadline;
        uint256 escrowDuration; // Luu thoi gian de tinh deadline luc endAuction
        uint256 sellerDeposit;
        uint256 buyerDeposit;
    }

    uint256 private auctionIdCounter;

    // quan ly danh sach cac phien dau gia
    mapping (uint256 => Auction) public auctions;
    // quan ly luong tien adf pending at bid cua moi nguoi (pull pattern)
    mapping (address => uint256) public pendingReturns;

    event AuctionCreated(
        uint256 indexed auctionId, address indexed seller, uint256 nftTokenId,
        uint256 endTime, uint256 reservePrice, uint256 minBidIncrement,
        AssetType assetType, DisputeType disputeType, uint256 escrowDuration
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionCanceled(uint256 indexed auctionId);
    event Withdraw(address indexed user, uint256 amount);
    event EscrowStarted(uint256 indexed auctionId, address buyer, address seller, uint256 deadline);
    event DeliveryConfirmed(uint256 indexed auctionId);
    event DisputeOpened(uint256 indexed auctionId, address indexed initiator, string evidenceIPFS);
    
    // Các sự kiện bổ sung cho cọc và dispute
    event SellerDeposited(uint256 indexed auctionId, uint256 amount);
    event BuyerDeposited(uint256 indexed auctionId, uint256 amount);
    event DepositsBurned(uint256 indexed auctionId, uint256 buyerAmount, uint256 sellerAmount);
    event DisputeContractUpdated(address indexed newDisputeContract);

    constructor(address _adfToken, address _adfNFT) Ownable(msg.sender) {
        adfToken = IERC20(_adfToken);
        adfNFT = IERC721(_adfNFT);
    } 

    /// @notice Thiết lập địa chỉ DisputeResolution contract
    function setDisputeContract(address _disputeContract) external onlyOwner {
        require(_disputeContract != address(0), "Invalid dispute contract");
        disputeContract = _disputeContract;
        emit DisputeContractUpdated(_disputeContract);
    }

    // [START] khoi tao phien dau gia
    function createAuction(
        uint256 _nftTokenId, 
        uint256 _duration, 
        uint256 _reservePrice,
        uint256 _minBidIncrement,
        AssetType _assetType,
        DisputeType _disputeType,
        uint256 _escrowDuration
    ) external nonReentrant {
        require(_nftTokenId > 0 && adfNFT.ownerOf(_nftTokenId) == msg.sender, "Not the NFT owner");
        require(_duration > 0, "Auction duration must be greater than 0");
        
        if (_assetType == AssetType.PHYSICAL) {
            require(_disputeType != DisputeType.NONE, "Physical asset requires dispute protection");
            require(_escrowDuration > 0, "Escrow duration required for physical asset");
        } else {
            _disputeType = DisputeType.NONE;
            _escrowDuration = 0;
        }
        
        adfNFT.transferFrom(msg.sender, address(this), _nftTokenId);
            // +1 phien dau gia moi
        auctionIdCounter++;
        uint256 currentAuctionId = auctionIdCounter;

            // Luu thong tin phien dau gia nay vao blockchain
        auctions[currentAuctionId] = Auction(
            msg.sender,
            _nftTokenId,
            block.timestamp + _duration,
            _reservePrice,
            _minBidIncrement,
            address(0),
            0,
            true,
            _assetType,
            _disputeType,
            AuctionPhase.BIDDING,
            0,
            _escrowDuration,
            0, // sellerDeposit
            0  // buyerDeposit
        );

        // Thu tiền cọc của seller nếu chọn Game Thẻoy
        if(_disputeType == DisputeType.GAME_THEORY_ESCROW) {
            require(adfToken.transferFrom(msg.sender, address(this), _reservePrice), "Seller deposit failed");
            auctions[currentAuctionId].sellerDeposit = _reservePrice;
            emit SellerDeposited(currentAuctionId, _reservePrice);
        }

        emit AuctionCreated(
            currentAuctionId, 
            msg.sender, 
            _nftTokenId,
            block.timestamp + _duration, 
            _reservePrice, 
            _minBidIncrement,
            _assetType,
            _disputeType,
            _escrowDuration
        );
    }

    // [BID] thao tac dau gia
    function bid(uint256 _auctionId, uint256 _bidAmount) external nonReentrant {

        // truy cap phien dau gia qua con tro storage
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(msg.sender != auction.seller, "Seller cannot bid");
        require(auction.active == true, "Auction is not active");
        require(auction.phase == AuctionPhase.BIDDING, "Not in bidding phase");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(_bidAmount >= auction.reservePrice, "Bid is too low");
        if(auction.currentTopBid > 0) require(_bidAmount >= auction.currentTopBid + auction.minBidIncrement, "Bid must be more than the previous top bid");

        // -----[EFFECTS]-----

        // Hoàn cọc cho người bị outbid cũ
        if(auction.currentTopBidder != address(0)) {
            uint256 refundAmount = auction.currentTopBid;
            if(auction.disputeType == DisputeType.GAME_THEORY_ESCROW) {
                refundAmount += auction.buyerDeposit;
            }
            pendingReturns[auction.currentTopBidder] += refundAmount;
        }

        // Ghi nhận người trả giá cao nhất mới và số tiền bid
        auction.currentTopBidder = msg.sender;
        auction.currentTopBid = _bidAmount;

        // cập nhật cọc của người bid mới
        if(auction.disputeType == DisputeType.GAME_THEORY_ESCROW) {
            auction.buyerDeposit = auction.reservePrice;
        } else {
            auction.buyerDeposit = 0;
        }

        // Thu tiền người bid mới (bid + cọc nếu chọn Game Theory)
        uint256 totalTransfer = _bidAmount + auction.buyerDeposit;
        require(adfToken.transferFrom(msg.sender, address(this), totalTransfer), "Transfer ADF failed");
        if(auction.disputeType == DisputeType.GAME_THEORY_ESCROW) {
            emit BuyerDeposited(_auctionId, auction.buyerDeposit);
        }

        emit BidPlaced(_auctionId, msg.sender, _bidAmount);
    }

    // [END] ket thuc phien dau gia
    function endAuction(uint256 _auctionId) external nonReentrant {
        //truy cap phien dau gia qua con tro storage
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(auction.active == true, "Auction is not active");
        require(auction.phase == AuctionPhase.BIDDING, "Not in bidding phase");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");

        // -----[EFFECTS]-----
        // đánh dấu phiên đấu giá là đã kết thúc
        auction.active = false;

        if (auction.currentTopBidder == address(0)) {
            // Không ai bid → Trả NFT về seller
            auction.phase = AuctionPhase.RESOLVED;
            adfNFT.transferFrom(address(this), auction.seller, auction.nftTokenId);
            emit AuctionEnded(_auctionId, address(0), 0);
            return;
        }

        if (auction.disputeType == DisputeType.NONE) {
            // Hàng số thuần tuý → Chuyển ngay
            auction.phase = AuctionPhase.RESOLVED;
            pendingReturns[auction.seller] += auction.currentTopBid;
            adfNFT.transferFrom(address(this), auction.currentTopBidder, auction.nftTokenId);
            emit AuctionEnded(_auctionId, auction.currentTopBidder, auction.currentTopBid);
        } else {
            // Có cơ chế bảo vệ → Vào Escrow
            auction.phase = AuctionPhase.ESCROW_HOLDING;
            auction.escrowDeadline = block.timestamp + auction.escrowDuration;
            // Tiền và NFT ở lại contract
            emit EscrowStarted(_auctionId, auction.currentTopBidder, auction.seller, auction.escrowDeadline);
        }
    }

    function confirmDelivery(uint256 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.currentTopBidder, "Only winner can confirm");
        require(auction.phase == AuctionPhase.ESCROW_HOLDING, "Not in escrow");

        // Giải phóng: Tiền → Seller, NFT → Buyer
        pendingReturns[auction.seller] += auction.currentTopBid;
        adfNFT.transferFrom(address(this), auction.currentTopBidder, auction.nftTokenId);

        // Hoàn trả tiền cọc cho cả 2 bên (nếu có)
        if(auction.sellerDeposit > 0) {
            pendingReturns[auction.seller] += auction.sellerDeposit;
            auction.sellerDeposit = 0;
        }
        if(auction.buyerDeposit > 0 ) {
            pendingReturns[auction.currentTopBidder] += auction.buyerDeposit;
            auction.buyerDeposit = 0;
        }

        auction.phase = AuctionPhase.RESOLVED;
        emit DeliveryConfirmed(_auctionId);
    }

    function openDispute(uint256 _auctionId, string calldata evidenceIPFS) external nonReentrant {
        Auction storage auction = auctions[_auctionId];
        require(auction.phase == AuctionPhase.ESCROW_HOLDING, "Not in escrow");
        require(
            msg.sender == auction.currentTopBidder || msg.sender == auction.seller,
            "Only buyer or seller"
        );
        require(block.timestamp <= auction.escrowDeadline, "Escrow deadline passed");
        auction.phase = AuctionPhase.DISPUTE_OPENED;
        
        // Gọi DisputeResolution contract để tạo phiên tranh chấp nếu đã deploy và set contract
        if (disputeContract != address(0) && disputeContract.code.length > 0) {
            IDisputeResolution(disputeContract).createDispute(
                _auctionId,
                auction.currentTopBidder,
                auction.seller,
                msg.sender,
                evidenceIPFS,
                uint8(auction.disputeType)
            );
        }
        
        emit DisputeOpened(_auctionId, msg.sender, evidenceIPFS);
    }

    function cancelAuction(uint256 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(msg.sender == auction.seller, "Only seller can cancel");
        require(auction.active == true, "Auction is not active");
        require(auction.phase == AuctionPhase.BIDDING, "Not in bidding phase");
        require(auction.currentTopBidder == address(0), "Auction has bids");
        require(auction.endTime > block.timestamp, "Auction has ended");

        // -----[EFFECTS]-----
        auction.active = false;
        auction.phase = AuctionPhase.CANCELED;
        
        if(auction.sellerDeposit > 0) {
            pendingReturns[auction.seller] += auction.sellerDeposit;
            auction.sellerDeposit = 0;
        }
        // Gui NFT ve cho nguoi ban
        adfNFT.transferFrom(address(this), auction.seller, auction.nftTokenId);

        // Emit su kien
        emit AuctionCanceled(_auctionId);
    }

    /// @notice Đốt toàn bộ tiền cọc và tiền bid của hai bên chuyển về địa chỉ 0x0
    /// @dev Chỉ cho phép DisputeResolution contract gọi khi tranh chấp Game Theory xảy ra không tự hòa giải
    function burnGameTheoryDeposits(uint256 _auctionId) external nonReentrant {
        // chỉ disputeContract mới được quyền gọi hàm này
        require(msg.sender == disputeContract, "Only DisputeResolution");
        Auction storage auction = auctions[_auctionId];
        
        // Đảm bảo phiên đấu giá đang ở trạng thái tranh chấp (DISPUTE_OPENED) và loại tranh chấp là GAME_THEORY_ESCROW
        require(auction.phase == AuctionPhase.DISPUTE_OPENED, "No dispute");
        require(auction.disputeType == DisputeType.GAME_THEORY_ESCROW, "Wrong type");
        
        uint256 buyerBid = auction.currentTopBid;
        uint256 sellerDep = auction.sellerDeposit;
        uint256 buyerDep = auction.buyerDeposit;
        uint256 totalBurn = buyerBid + sellerDep + buyerDep;
        // Reset sellerDeposit và buyerDeposit của auction về 0
        auction.sellerDeposit = 0;
        auction.buyerDeposit = 0;
        auction.phase = AuctionPhase.RESOLVED;
        auction.active = false;

        // Trả lại NFT về cho seller (vì NFT ở lại ví của hợp đồng, không bị đốt)
        adfNFT.transferFrom(address(this), auction.seller, auction.nftTokenId);
        // BURN tienf cojc
        require(adfToken.transfer(address(0xdead), totalBurn), "Burn failed");

        emit DepositsBurned(_auctionId, buyerBid + buyerDep, sellerDep);
    }

    // ham rut tien
    function withdraw() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No pending returns");
        pendingReturns[msg.sender] = 0;
        require(adfToken.transfer(msg.sender, amount), "Transfer ADF failed");
        emit Withdraw(msg.sender, amount);
    }
}