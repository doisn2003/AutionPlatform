//SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ADF_NFT is ERC721, ERC721URIStorage, Ownable {

    // tao id duy nhat cua moi NFT (bat dau tu 1)
    uint256 private _nextTokenId = 1;

    // su kien mint NFT moi
    event NFTMinted(address indexed owner, uint256 indexed tokenId);
    
    constructor(address initialOwner) 
    ERC721("Auction Decentralized Free - NFT", "ADFs") 
    Ownable(initialOwner) {}
    
    // ------------START OVERRIDE-----------------
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    // ------------------END OVERRIDE---------------

    function mintNFT(string memory _tokenURI) public returns(uint256) {
        
        uint256 newItemId = _nextTokenId;
        _nextTokenId++;

        // Duc NFT cho nguoi goi ham
        _safeMint(msg.sender, newItemId);
        // Gan link IPFS vao NFT vua duc
        _setTokenURI(newItemId, _tokenURI);

        emit NFTMinted(msg.sender, newItemId);

        return newItemId;
    }
    
}