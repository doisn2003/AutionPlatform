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
    // quan ly luong tien adf can rut cua moi nguoi (pull pattern)
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

    // khoi tao phien dau gia
    function createAuction(
        uint256 _nftTokenId, 
        uint256 _duration, 
        uint256 _reservePrice,
        uint256 _minBidIncrement
        ) external nonReentrant {
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

            emit AuctionCreated(
                currentAuctionId, 
                msg.sender, 
                _nftTokenId,
                block.timestamp + _duration, 
                _reservePrice, 
                _minBidIncrement
            );
        }
}