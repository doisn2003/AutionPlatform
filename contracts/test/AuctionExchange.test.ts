// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("AuctionExchange", async function () {
    const { viem, networkHelpers } = await network.create();

    async function deployFixtures() {
        const [owner, seller, buyer1, buyer2] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        
        const auction = await viem.deployContract("AuctionExchange", [
            adf.address,
            nft.address
        ]);

        // Seller đúc 1 NFT (tokenId đầu tiên sẽ là 1 vì đã đổi _nextTokenId = 1)
        await nft.write.mintNFT(["ipfs://QmSellerNFT"], { account: seller.account });
        // Seller cấp quyền cho sàn
        await nft.write.approve([auction.address, 1n], { account: seller.account });

        // Buyer1, Buyer2 gọi faucet để lấy 10 ADF
        await adf.write.faucet({ account: buyer1.account });
        await adf.write.faucet({ account: buyer2.account });

        // Lấy số thập phân của ADF
        const decimals = await adf.read.decimals();
        const amountToApprove = 1000n * 10n ** BigInt(decimals); 
        
        // Cấp quyền tiêu tiền cho sàn
        await adf.write.approve([auction.address, amountToApprove], { account: buyer1.account });
        await adf.write.approve([auction.address, amountToApprove], { account: buyer2.account });

        return { adf, nft, auction, owner, seller, buyer1, buyer2, decimals };
    }

    describe("Tạo Phiên Đấu Giá (Create Auction)", function () {
        it("Sàn phải khóa NFT và tạo phiên đấu giá thành công", async function () {
            const { auction, nft, seller, decimals } = await networkHelpers.loadFixture(deployFixtures);
            
            const duration = 86400n; // 1 ngày
            const reservePrice = 1n * 10n ** BigInt(decimals); // 1 ADF
            const minBidIncrement = 1n * 10n ** BigInt(decimals) / 10n; // 0.1 ADF

            // nftTokenId là 1n
            await auction.write.createAuction([1n, duration, reservePrice, minBidIncrement], { account: seller.account });

            // Kiểm tra NFT đã bị khóa vào Sàn chưa
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), auction.address.toLowerCase());

            // Kiểm tra trạng thái đấu giá (auctionId đầu tiên là 1n)
            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[0].toLowerCase(), seller.account.address.toLowerCase()); // seller
            assert.equal(auctionDetails[7], true); // active = true
        });

        it("Báo lỗi nếu người tạo không phải chủ NFT", async function () {
            const { auction, buyer1, decimals } = await networkHelpers.loadFixture(deployFixtures);
            
            const reservePrice = 1n * 10n ** BigInt(decimals);
            
            await viem.assertions.revertWith(
                auction.write.createAuction([1n, 86400n, reservePrice, 0n], { account: buyer1.account }),
                "Not the NFT owner"
            );
        });

        it("Báo lỗi nếu thời gian đấu giá bằng 0", async function () {
            const { auction, seller, decimals } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 1n * 10n ** BigInt(decimals);
            
            await viem.assertions.revertWith(
                auction.write.createAuction([1n, 0n, reservePrice, 0n], { account: seller.account }),
                "Auction duration must be greater than 0"
            );
        });
    });

    describe("Cơ chế Trả Giá (Bidding)", function () {
        async function deployAndCreateAuction() {
            const fixture = await deployFixtures();
            const duration = 86400n; // 1 day
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            const minBidIncrement = 1n * 10n ** BigInt(fixture.decimals) / 10n; // 0.1 ADF
            await fixture.auction.write.createAuction([1n, duration, reservePrice, minBidIncrement], { account: fixture.seller.account });
            return { ...fixture, reservePrice, minBidIncrement };
        }

        it("Báo lỗi nếu trả giá thấp hơn giá khởi điểm", async function () {
            const { auction, buyer1, reservePrice } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            await viem.assertions.revertWith(
                auction.write.bid([1n, reservePrice - 1n], { account: buyer1.account }),
                "Bid is too low"
            );
        });

        it("Trả giá hợp lệ và trừ tiền ADF", async function () {
            const { auction, adf, buyer1, reservePrice } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            const balanceBefore = await adf.read.balanceOf([buyer1.account.address]);
            
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });
            
            // Kiểm tra currentTopBidder (index 5) và currentTopBid (index 6)
            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[5].toLowerCase(), buyer1.account.address.toLowerCase());
            assert.equal(auctionDetails[6], reservePrice);

            // Kiểm tra số dư ADF bị trừ
            const balanceAfter = await adf.read.balanceOf([buyer1.account.address]);
            assert.equal(balanceAfter, balanceBefore - reservePrice);
        });

        it("Khi bị Outbid, tiền người cũ được hoàn vào pendingReturns", async function () {
            const { auction, buyer1, buyer2, reservePrice, minBidIncrement } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });
            
            const higherBid = reservePrice + minBidIncrement;
            await auction.write.bid([1n, higherBid], { account: buyer2.account });

            // Buyer1 phải có số dư trong pendingReturns
            const pendingReturnBuyer1 = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(pendingReturnBuyer1, reservePrice);
        });
    });

    describe("Hủy Đấu Giá (Cancel Auction)", function () {
        async function deployAndCreateAuction() {
            const fixture = await deployFixtures();
            const duration = 86400n; // 1 day
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            await fixture.auction.write.createAuction([1n, duration, reservePrice, 0n], { account: fixture.seller.account });
            return fixture;
        }

        it("Hủy thành công, trạng thái Inactive và trả lại NFT", async function () {
            const { auction, nft, seller } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            await auction.write.cancelAuction([1n], { account: seller.account });
            
            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[7], false); // active = false

            // NFT trở lại ví seller
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), seller.account.address.toLowerCase());
        });

        it("Không cho hủy nếu đã có người trả giá", async function () {
            const { auction, seller, buyer1, decimals } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            const bidAmount = 1n * 10n ** BigInt(decimals);
            await auction.write.bid([1n, bidAmount], { account: buyer1.account });

            await viem.assertions.revertWith(
                auction.write.cancelAuction([1n], { account: seller.account }),
                "Auction has bids"
            );
        });
    });

    describe("Kết Thúc Đấu Giá (End Auction)", function () {
        async function deployAndCreateAuction() {
            const fixture = await deployFixtures();
            const duration = 86400n; // 1 day
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            await fixture.auction.write.createAuction([1n, duration, reservePrice, 0n], { account: fixture.seller.account });
            return { ...fixture, reservePrice };
        }

        it("Báo lỗi nếu thời gian chưa kết thúc", async function () {
            const { auction, seller } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            await viem.assertions.revertWith(
                auction.write.endAuction([1n], { account: seller.account }),
                "Auction has not ended yet"
            );
        });

        it("Kết thúc thành công CÓ người thắng: Tiền vào pendingReturns, NFT trao cho người thắng", async function () {
            const { auction, nft, seller, buyer1, reservePrice } = await networkHelpers.loadFixture(deployAndCreateAuction);
            
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            // Tua nhanh thời gian qua 1 ngày
            await networkHelpers.time.increase(86400n + 1n);

            await auction.write.endAuction([1n], { account: seller.account });

            const pendingReturnSeller = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(pendingReturnSeller, reservePrice);

            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), buyer1.account.address.toLowerCase());
        });
    });

    describe("Cơ chế Rút Tiền (Withdraw)", function () {
        async function setupWithdrawScenario() {
            const fixture = await deployFixtures();
            const duration = 86400n; // 1 day
            const reservePrice = 1n * 10n ** BigInt(fixture.decimals);
            await fixture.auction.write.createAuction([1n, duration, reservePrice, 0n], { account: fixture.seller.account });
            
            // Buyer 1 đấu giá
            await fixture.auction.write.bid([1n, reservePrice], { account: fixture.buyer1.account });
            
            // Buyer 2 đấu giá đè lên (Buyer 1 sẽ có pendingReturns)
            const higherBid = reservePrice + 1n;
            await fixture.auction.write.bid([1n, higherBid], { account: fixture.buyer2.account });

            return { ...fixture, reservePrice, higherBid };
        }

        it("Cho phép rút tiền từ pendingReturns", async function () {
            const { auction, adf, buyer1, reservePrice } = await networkHelpers.loadFixture(setupWithdrawScenario);
            
            const balanceBefore = await adf.read.balanceOf([buyer1.account.address]);
            
            await auction.write.withdraw({ account: buyer1.account });
            
            const balanceAfter = await adf.read.balanceOf([buyer1.account.address]);
            assert.equal(balanceAfter, balanceBefore + reservePrice);

            // Kiểm tra pendingReturns đã bị set về 0 chưa
            const pendingAfter = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(pendingAfter, 0n);
        });
        
        it("Báo lỗi nếu ví không có nợ", async function () {
            const { auction, owner } = await networkHelpers.loadFixture(setupWithdrawScenario);
            
            await viem.assertions.revertWith(
                auction.write.withdraw({ account: owner.account }),
                "No pending returns"
            );
        });
    });
});
