//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AuctionExchange is ReentrancyGuard{
    IERC20 public adfToken;
    IERC721 public adfNFT;

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
    }

    // bien dem de tao ra ID duy nhat cho moi phien dau gia
    uint256 private auctionIdCounter;

    // quan ly danh sach cac phien dau gia
    mapping (uint256 => Auction) public auctions;
    // quan ly luong tien adf pending at bid cua moi nguoi (pull pattern)
    mapping (address => uint256) public pendingReturns;

    // su kien
    event AuctionCreated(uint256 indexed auctionId, address indexed seller, uint256 nftTokenId, uint256 endTime, uint256 reservePrice, uint256 minBidIncrement);
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address indexed winner, uint256 amount);
    event AuctionCanceled(uint256 indexed auctionId);
    event Withdraw(address indexed user, uint256 amount);

    constructor(address _adfToken, address _adfNFT) {
        adfToken = IERC20(_adfToken);
        adfNFT = IERC721(_adfNFT);
    } 

    // [START] khoi tao phien dau gia
    function createAuction(
        uint256 _nftTokenId, 
        uint256 _duration, 
        uint256 _reservePrice,
        uint256 _minBidIncrement
        ) external nonReentrant {
            require(_nftTokenId > 0 && adfNFT.ownerOf(_nftTokenId) == msg.sender, "Not the NFT owner");
            require(_duration > 0, "Auction duration must be greater than 0");
            
            // chuyen NFT tu nguoi ban vao hop dong nay luu giu trong qua trinh dau gia
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
                true
            );

            // emit su kien
            emit AuctionCreated(
                currentAuctionId, 
                msg.sender, 
                _nftTokenId,
                block.timestamp + _duration, 
                _reservePrice, 
                _minBidIncrement
            );
    }

    // [BID] thao tac dau gia
    function bid(uint256 _auctionId, uint256 _bidAmount) external nonReentrant {


        // truy cap phien dau gia qua con tro storage
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(auction.active == true, "Auction is not active");
        require(block.timestamp < auction.endTime, "Auction has ended");
        require(_bidAmount >= auction.reservePrice, "Bid is too low");
        if(auction.currentTopBid > 0) require(_bidAmount >= auction.currentTopBid + auction.minBidIncrement, "Bid must be more than the previous top bid");

        // -----[EFFECTS]-----
        // cat giu tien cua nguoi thua cuoc
        if(auction.currentTopBidder != address(0)) {
            pendingReturns[auction.currentTopBidder] += auction.currentTopBid;
        }
        // ghi nhan nguoiw tra gia cao nhat moi
        auction.currentTopBidder = msg.sender;
        auction.currentTopBid = _bidAmount;

        // -----[INTERACTIONS]-----
        require(adfToken.transferFrom(msg.sender, address(this), _bidAmount), "Transfer ADF failed");
        emit BidPlaced(_auctionId, msg.sender, _bidAmount);
        
    }

    // [END] ket thuc phien dau gia
    function endAuction(uint256 _auctionId) external nonReentrant {
        //truy cap phien dau gia qua con tro storage
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(auction.active == true, "Auction is not active");
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");

        // -----[EFFECTS]-----
        // đánh dấu phiên đấu giá là đã kết thúc
        auction.active = false;
        // 1. Cong tien cho nguoi ban
        if(auction.currentTopBidder != address(0)) {
            pendingReturns[auction.seller] += auction.currentTopBid;
        }
        // 2. Gui NFT
        address winner = auction.currentTopBidder;
        // 2.1 Neu co nguoi thang --> chuyen NFT cho nguoi thang
        if(winner != address(0)) {
            adfNFT.transferFrom(address(this), winner, auction.nftTokenId);
            emit AuctionEnded(_auctionId, winner, auction.currentTopBid);
        }else { //2.2. Neu khong co nguoi thang --> chuyen NFT cho nguoi ban
            adfNFT.transferFrom(address(this), auction.seller, auction.nftTokenId);
            emit AuctionEnded(_auctionId, address(0), 0);
        }
   
    }

    // [CANCEL] nguoi ban huy dau gia neu khong co ai tham gia dau gia
    function cancelAuction(uint256 _auctionId) external nonReentrant {
        Auction storage auction = auctions[_auctionId];

        // -----[CHECK]-----
        require(msg.sender == auction.seller, "Only seller can cancel");
        require(auction.active == true, "Auction is not active");
        require(auction.currentTopBidder == address(0), "Auction has bids");
        require(auction.endTime > block.timestamp, "Auction has ended");

        // -----[EFFECTS]-----
        auction.active = false;
        
        // Gui NFT ve cho nguoi ban
        adfNFT.transferFrom(address(this), auction.seller, auction.nftTokenId);

        // Emit su kien
        emit AuctionCanceled(_auctionId);
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