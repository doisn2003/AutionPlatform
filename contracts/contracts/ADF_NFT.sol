//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {ERC721} from "./tokens-standard/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ADF_NFT is ERC721, Ownable {
    constructor(address initialOwner) ERC721("Auction Decentralized Free - NFT", "ADFs") Ownable(initialOwner) {}
}