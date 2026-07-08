// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("AuctionExchange v2", async function () {
    const { viem, networkHelpers } = await network.create();

    const ASSET_TYPE_DIGITAL = 0;
    const ASSET_TYPE_PHYSICAL = 1;

    const DISPUTE_TYPE_NONE = 0;
    const DISPUTE_TYPE_GAME_THEORY = 1;

    const PHASE_BIDDING = 0;
    const PHASE_ESCROW = 1;
    const PHASE_DELIVERED = 2;
    const PHASE_DISPUTE_OPENED = 3;
    const PHASE_RESOLVED = 4;
    const PHASE_CANCELED = 5;

    async function deployFixtures() {
        const [owner, seller, buyer1, buyer2] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        
        const auction = await viem.deployContract("AuctionExchange", [
            adf.address,
            nft.address
        ]);

        await nft.write.mintNFT(["ipfs://QmSellerNFT"], { account: seller.account });
        await nft.write.approve([auction.address, 1n], { account: seller.account });

        const decimals = await adf.read.decimals();
        const amountToApprove = 1000n * 10n ** BigInt(decimals); 

        // Chuyển ADF từ owner sang seller và approve để làm cọc cho Game Theory
        await adf.write.transfer([seller.account.address, amountToApprove], { account: owner.account });
        await adf.write.approve([auction.address, amountToApprove], { account: seller.account });

        await adf.write.faucet({ account: buyer1.account });
        await adf.write.faucet({ account: buyer2.account });
        
        await adf.write.approve([auction.address, amountToApprove], { account: buyer1.account });
        await adf.write.approve([auction.address, amountToApprove], { account: buyer2.account });

        return { adf, nft, auction, owner, seller, buyer1, buyer2, decimals };
    }

    describe("Tạo Phiên Đấu Giá (Create Auction)", function () {
        it("Tạo đấu giá DIGITAL thành công (không cần escrow)", async function () {
            const { auction, nft, seller, decimals } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 1n * 10n ** BigInt(decimals);
            
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 0n, 
                ASSET_TYPE_DIGITAL, DISPUTE_TYPE_NONE, 0n
            ], { account: seller.account });

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[0].toLowerCase(), seller.account.address.toLowerCase());
            assert.equal(auctionDetails[8], ASSET_TYPE_DIGITAL);
            assert.equal(auctionDetails[9], DISPUTE_TYPE_NONE);
            assert.equal(auctionDetails[10], PHASE_BIDDING);
        });

        it("Tạo đấu giá PHYSICAL thành công (cần escrow)", async function () {
            const { auction, nft, seller, decimals } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 1n * 10n ** BigInt(decimals);
            
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 0n, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 7n * 86400n // 7 days escrow
            ], { account: seller.account });

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[8], ASSET_TYPE_PHYSICAL);
            assert.equal(auctionDetails[9], DISPUTE_TYPE_GAME_THEORY);
        });

        it("Báo lỗi nếu PHYSICAL mà không cấu hình escrow", async function () {
            const { auction, seller, decimals } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 1n * 10n ** BigInt(decimals);
            
            await viem.assertions.revertWith(
                auction.write.createAuction([
                    1n, 86400n, reservePrice, 0n, 
                    ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_NONE, 0n
                ], { account: seller.account }),
                "Physical asset requires dispute protection"
            );
        });
    });

    describe("Kết thúc Đấu Giá (End Auction) & Escrow", function () {
        async function createDigitalAuction() {
            const fixture = await deployFixtures();
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 0n, 
                ASSET_TYPE_DIGITAL, DISPUTE_TYPE_NONE, 0n
            ], { account: fixture.seller.account });
            return { ...fixture, reservePrice };
        }

        async function createPhysicalAuction() {
            const fixture = await deployFixtures();
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 0n, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n * 7n
            ], { account: fixture.seller.account });
            return { ...fixture, reservePrice };
        }

        it("Hàng SỐ (DIGITAL): Kết thúc chuyển ngay NFT cho buyer và trả tiền cho seller", async function () {
            const { auction, nft, seller, buyer1, reservePrice } = await networkHelpers.loadFixture(createDigitalAuction);
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            await networkHelpers.time.increase(86400n + 1n);
            await auction.write.endAuction([1n], { account: seller.account });

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[10], PHASE_RESOLVED);

            // NFT goes to buyer
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), buyer1.account.address.toLowerCase());

            // Money to pending returns for seller
            const pendingReturnSeller = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(pendingReturnSeller, reservePrice);
        });

        it("Hàng VẬT LÝ (PHYSICAL): Kết thúc vào trạng thái ESCROW, tiền/NFT bị giữ lại", async function () {
            const { auction, nft, seller, buyer1, reservePrice } = await networkHelpers.loadFixture(createPhysicalAuction);
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            await networkHelpers.time.increase(86400n + 1n);
            await auction.write.endAuction([1n], { account: seller.account });

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[10], PHASE_ESCROW); // 1 = ESCROW_HOLDING

            // NFT is STILL in contract
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), auction.address.toLowerCase());

            // Seller pending returns should be 0 because it's locked
            const pendingReturnSeller = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(pendingReturnSeller, 0n);
        });

        it("Buyer xác nhận nhận hàng (confirmDelivery), giải phóng Escrow", async function () {
            const { auction, nft, seller, buyer1, reservePrice } = await networkHelpers.loadFixture(createPhysicalAuction);
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            await networkHelpers.time.increase(86400n + 1n);
            await auction.write.endAuction([1n], { account: seller.account });

            // Buyer confirms delivery
            await auction.write.confirmDelivery([1n], { account: buyer1.account });

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[10], PHASE_RESOLVED); // 4 = RESOLVED

            // NFT finally given to buyer
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), buyer1.account.address.toLowerCase());

            // Money available for seller (bid + sellerDeposit refund)
            const pendingReturnSeller = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(pendingReturnSeller, reservePrice * 2n);
        });
    });
});
