//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ADF is ERC20 {
    constructor() ERC20("Auction Decentralized Free", "ADF") {
        // Van giu lai phan duc cho Admin de test cac tinh nang sau nay
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    // Ham Faucet cho phep User nhan 10 ADF (nhan thoai mai khong gioi han)
    function faucet() external {
        _mint(msg.sender, 10 * 10 ** decimals());
    }
}