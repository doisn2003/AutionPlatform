// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ADF_NFT Token", async function () {
    const { viem, networkHelpers } = await network.create();

    async function deployNFT() {
        const [owner, user1] = await viem.getWalletClients();
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        return { nft, owner, user1 };
    }

    describe("Khởi tạo Deployment", function () {
        it("Kiểm tra tên và ký hiệu NFT", async function () {
            const { nft } = await networkHelpers.loadFixture(deployNFT);
            assert.equal(await nft.read.name(), "Auction Decentralized Free - NFT");
            assert.equal(await nft.read.symbol(), "ADFs");
        });
    });

    describe("Tính năng Đúc (Mint) NFT", function () {
        it("Bất kỳ ai cũng có thể đúc NFT kèm đường dẫn IPFS", async function () {
            const { nft, user1 } = await networkHelpers.loadFixture(deployNFT);
            
            const tokenURI = "ipfs://QmTest123";
            const txPromise = nft.write.mintNFT([tokenURI], { account: user1.account });
            
            // Chờ giao dịch hoàn tất
            await txPromise;
            
            // TokenId đầu tiên được đúc sẽ là 1n
            const ownerOfToken = await nft.read.ownerOf([1n]);
            assert.equal(ownerOfToken.toLowerCase(), user1.account.address.toLowerCase());
            
            const uriOfToken = await nft.read.tokenURI([1n]);
            assert.equal(uriOfToken, tokenURI);
        });
    });
});
