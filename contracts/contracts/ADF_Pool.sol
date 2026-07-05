// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ADF_Pool is ReentrancyGuard, Ownable {
    IERC20 public adfToken;

    // Reserve (Dự trữ thanh khoản)
    uint256 public reserveETH;   // Lượng ETH trong Pool
    uint256 public reserveADF;   // Lượng ADF trong Pool
    uint256 public K;            // Hằng số tích K = reserveETH * reserveADF

    // Phí giao dịch (0.3% = 3/1000)
    uint256 public constant FEE_NUMERATOR = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;

    // Địa chỉ hợp đồng DisputeResolution
    address public disputeContract;

    // Events
    event LiquidityAdded(address indexed provider, uint256 ethAmount, uint256 adfAmount);
    event SwapETHForADF(address indexed buyer, uint256 ethIn, uint256 adfOut, uint256 feeCollected);
    event SwapADFForETH(address indexed seller, uint256 adfIn, uint256 ethOut, uint256 feeCollected);
    event JurorRewardWithdrawn(address indexed disputeContract, uint256 amount);
    event DisputeContractUpdated(address indexed newDisputeContract);

    constructor(address _adfToken, address _initialOwner) Ownable(_initialOwner) {
        require(_adfToken != address(0), "Invalid token address");
        adfToken = IERC20(_adfToken);
    }

    /// @notice Admin set địa chỉ DisputeResolution (chỉ gọi 1 lần hoặc cập nhật khi cần)
    function setDisputeContract(address _disputeContract) external onlyOwner {
        require(_disputeContract != address(0), "Invalid dispute contract");
        disputeContract = _disputeContract;
        emit DisputeContractUpdated(_disputeContract);
    }

    /// @notice Admin nạp thanh khoản ban đầu (ETH + ADF)
    function addLiquidity(uint256 adfAmount) external payable onlyOwner nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(adfAmount > 0, "Must send ADF");

        // Transfer ADF from sender to pool
        require(adfToken.transferFrom(msg.sender, address(this), adfAmount), "ADF transfer failed");

        reserveETH += msg.value;
        reserveADF += adfAmount;
        K = reserveETH * reserveADF;

        emit LiquidityAdded(msg.sender, msg.value, adfAmount);
    }

    /// @notice Người dùng gửi ETH -> nhận ADF
    function swapETHForADF(uint256 minADFOut) external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        require(reserveETH > 0 && reserveADF > 0, "Pool has no liquidity");

        // Tính phí 0.3% trên lượng ETH đầu vào
        uint256 feeETH = (msg.value * FEE_NUMERATOR) / FEE_DENOMINATOR;
        uint256 ethInAfterFee = msg.value - feeETH;

        // Công thức: x * y = K -> (reserveETH + ethInAfterFee) * newReserveADF = K
        uint256 newReserveETH = reserveETH + ethInAfterFee;
        uint256 newReserveADF = K / newReserveETH;
        uint256 adfOut = reserveADF - newReserveADF;

        require(adfOut >= minADFOut, "Slippage too high");
        require(adfOut > 0, "Insufficient output");

        // Cập nhật reserves và K
        reserveETH = reserveETH + msg.value; // Nhận toàn bộ ETH (bao gồm phí)
        reserveADF = newReserveADF;
        K = reserveETH * reserveADF;

        // Chuyển ADF cho người mua
        require(adfToken.transfer(msg.sender, adfOut), "ADF transfer failed");

        emit SwapETHForADF(msg.sender, msg.value, adfOut, feeETH);
    }

    /// @notice Người dùng gửi ADF -> nhận ETH
    function swapADFForETH(uint256 adfAmount, uint256 minETHOut) external nonReentrant {
        require(adfAmount > 0, "Must send ADF");
        require(reserveETH > 0 && reserveADF > 0, "Pool has no liquidity");

        // Nhận ADF từ người bán
        require(adfToken.transferFrom(msg.sender, address(this), adfAmount), "ADF transfer failed");

        // Tính phí 0.3% trên lượng ADF đầu vào
        uint256 feeADF = (adfAmount * FEE_NUMERATOR) / FEE_DENOMINATOR;
        uint256 adfInAfterFee = adfAmount - feeADF;

        // Công thức: x * y = K -> newReserveADF * newReserveETH = K
        uint256 newReserveADF = reserveADF + adfInAfterFee;
        uint256 newReserveETH = K / newReserveADF;
        uint256 ethOut = reserveETH - newReserveETH;

        require(ethOut >= minETHOut, "Slippage too high");
        require(ethOut > 0, "Insufficient output");

        // Cập nhật reserves và K
        reserveADF = reserveADF + adfAmount; // Nhận toàn bộ ADF (bao gồm phí)
        reserveETH = newReserveETH;
        K = reserveETH * reserveADF;

        // Chuyển ETH cho người bán
        (bool success, ) = msg.sender.call{value: ethOut}("");
        require(success, "ETH transfer failed");

        emit SwapADFForETH(msg.sender, adfAmount, ethOut, feeADF);
    }

    /// @notice DisputeResolution contract rút ADF trực tiếp từ bể thanh khoản chung
    function withdrawJurorReward(uint256 amount) external nonReentrant {
        require(msg.sender == disputeContract, "Only DisputeResolution");
        require(amount <= reserveADF, "Insufficient reserve");

        reserveADF -= amount;
        K = reserveETH * reserveADF;

        require(adfToken.transfer(disputeContract, amount), "Transfer failed");

        emit JurorRewardWithdrawn(disputeContract, amount);
    }

    /// @notice View: Trả về lượng output ước tính
    function getAmountOut(uint256 amountIn, bool isETHForADF) external view returns (uint256) {
        require(amountIn > 0, "Amount must be greater than 0");
        if (reserveETH == 0 || reserveADF == 0) return 0;

        uint256 fee = (amountIn * FEE_NUMERATOR) / FEE_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        if (isETHForADF) {
            uint256 newReserveETH = reserveETH + amountInAfterFee;
            uint256 newReserveADF = K / newReserveETH;
            return reserveADF - newReserveADF;
        } else {
            uint256 newReserveADF = reserveADF + amountInAfterFee;
            uint256 newReserveETH = K / newReserveADF;
            return reserveETH - newReserveETH;
        }
    }

    /// @notice View: Trả về tỷ giá ADF/ETH (nhân với 1e18)
    function getPrice() external view returns (uint256) {
        if (reserveADF == 0) return 0;
        return (reserveETH * 1e18) / reserveADF;
    }
}
