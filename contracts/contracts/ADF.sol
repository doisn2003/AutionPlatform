//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {ERC20} from "./tokens-standard/ERC20.sol";

contract ADF is ERC20 {
    constructor() ERC20("Auction Data Format", "ADF") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
   }
}