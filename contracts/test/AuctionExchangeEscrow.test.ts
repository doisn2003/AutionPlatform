// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("AuctionExchange Game Theory Escrow Test", async function () {
    const { viem, networkHelpers } = await network.create();

    const ASSET_TYPE_PHYSICAL = 1;
    const DISPUTE_TYPE_GAME_THEORY = 1;

    const PHASE_BIDDING = 0;
    const PHASE_ESCROW = 1;
    const PHASE_DISPUTE_OPENED = 3;
    const PHASE_RESOLVED = 4;
    const PHASE_CANCELED = 5;

    async function deployFixtures() {
        const [owner, seller, buyer1, buyer2, disputeContractMock] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        
        const auction = await viem.deployContract("AuctionExchange", [
            adf.address,
            nft.address
        ]);

        const decimals = await adf.read.decimals();
        const unit = 10n ** BigInt(decimals);

        // Mint NFT cho seller
        await nft.write.mintNFT(["ipfs://QmPhysicalNFT"], { account: seller.account });
        await nft.write.approve([auction.address, 1n], { account: seller.account });

        // Chuyển 1000 ADF từ owner sang seller để làm cọc
        await adf.write.transfer([seller.account.address, 1000n * unit], { account: owner.account });
        await adf.write.approve([auction.address, 1000n * unit], { account: seller.account });

        // Faucet và approve cho buyers
        for (let i = 0; i < 150; i++) {
            await adf.write.faucet({ account: buyer1.account });
            await adf.write.faucet({ account: buyer2.account });
        } // Mỗi bên có 1500 ADF

        await adf.write.approve([auction.address, 2000n * unit], { account: buyer1.account });
        await adf.write.approve([auction.address, 2000n * unit], { account: buyer2.account });

        // Set dispute contract giả lập để test
        await auction.write.setDisputeContract([disputeContractMock.account.address]);

        return { adf, nft, auction, owner, seller, buyer1, buyer2, disputeContractMock, unit };
    }

    describe("Seller Ký Quỹ khi Tạo Đấu Giá", function () {
        it("Tạo đấu giá Game Theory yêu cầu Seller nộp cọc = reservePrice", async function () {
            const { adf, auction, seller, unit } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 500n * unit;

            const balanceBefore = await adf.read.balanceOf([seller.account.address]);

            // Tạo đấu giá PHYSICAL, GAME_THEORY_ESCROW, cọc 500 ADF
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: seller.account });

            const balanceAfter = await adf.read.balanceOf([seller.account.address]);
            assert.equal(balanceBefore - balanceAfter, reservePrice);

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[13], reservePrice); // sellerDeposit
        });
    });

    describe("Buyer Ký Quỹ & Hoàn Trả khi bị Outbid", function () {
        async function createAuctionFixture() {
            const fixture = await deployFixtures();
            const reservePrice = 500n * fixture.unit;
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * fixture.unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: fixture.seller.account });
            return { ...fixture, reservePrice };
        }

        it("Đặt bid đầu tiên yêu cầu Buyer nộp bid + cọc", async function () {
            const { adf, auction, buyer1, reservePrice } = await networkHelpers.loadFixture(createAuctionFixture);
            const balanceBefore = await adf.read.balanceOf([buyer1.account.address]);

            // Bid đúng bằng reservePrice = 500 ADF. Tổng tiền nộp = 500 bid + 500 cọc = 1000 ADF
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            const balanceAfter = await adf.read.balanceOf([buyer1.account.address]);
            assert.equal(balanceBefore - balanceAfter, reservePrice * 2n);

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[6], reservePrice); // currentTopBid = 500
            assert.equal(auctionDetails[14], reservePrice); // buyerDeposit = 500
        });

        it("Hoàn trả bid + cọc cho người bị outbid", async function () {
            const { auction, buyer1, buyer2, reservePrice, unit } = await networkHelpers.loadFixture(createAuctionFixture);

            // Buyer1 bid 500 ADF (nộp 1000 ADF)
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            // Buyer2 bid 600 ADF (nộp 600 bid + 500 cọc = 1100 ADF)
            await auction.write.bid([1n, 600n * unit], { account: buyer2.account });

            // Buyer1 phải được hoàn trả 1000 ADF vào pendingReturns
            const buyer1Pending = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(buyer1Pending, 1000n * unit);
        });
    });

    describe("Hoàn Trả Cọc khi confirmDelivery & cancelAuction", function () {
        async function setupEscrowFixture() {
            const fixture = await deployFixtures();
            const reservePrice = 500n * fixture.unit;
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * fixture.unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: fixture.seller.account });

            await fixture.auction.write.bid([1n, reservePrice], { account: fixture.buyer1.account });
            await networkHelpers.time.increase(86400n + 1n);
            await fixture.auction.write.endAuction([1n], { account: fixture.seller.account });

            return { ...fixture, reservePrice };
        }

        it("confirmDelivery hoàn trả cọc cho cả hai bên", async function () {
            const { auction, seller, buyer1, reservePrice } = await networkHelpers.loadFixture(setupEscrowFixture);

            // Xác nhận nhận hàng
            await auction.write.confirmDelivery([1n], { account: buyer1.account });

            // Seller nhận: 500 (bid) + 500 (sellerDeposit) = 1000 ADF
            const sellerPending = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(sellerPending, 1000n * reservePrice / 500n);

            // Buyer nhận lại: 500 (buyerDeposit)
            const buyerPending = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(buyerPending, reservePrice);

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[13], 0n); // sellerDeposit reset về 0
            assert.equal(auctionDetails[14], 0n); // buyerDeposit reset về 0
            assert.equal(auctionDetails[10], PHASE_RESOLVED);
        });

        it("cancelAuction hoàn trả cọc cho Seller khi chưa có ai bid", async function () {
            const { auction, seller, unit } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 500n * unit;

            // Tạo đấu giá
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: seller.account });

            // Hủy phiên đấu giá
            await auction.write.cancelAuction([1n], { account: seller.account });

            // Seller phải được hoàn trả 500 ADF cọc
            const sellerPending = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(sellerPending, reservePrice);

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[10], PHASE_CANCELED);
            assert.equal(auctionDetails[13], 0n);
        });
    });

    describe("Đốt Cọc khi Tranh Chấp (burnGameTheoryDeposits)", function () {
        async function setupDisputeFixture() {
            const fixture = await deployFixtures();
            const reservePrice = 500n * fixture.unit;
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * fixture.unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: fixture.seller.account });

            await fixture.auction.write.bid([1n, reservePrice], { account: fixture.buyer1.account });
            await networkHelpers.time.increase(86400n + 1n);
            await fixture.auction.write.endAuction([1n], { account: fixture.seller.account });

            // Mở tranh chấp
            await fixture.auction.write.openDispute([1n, "ipfs://evidence"], { account: fixture.buyer1.account });

            return { ...fixture, reservePrice };
        }

        it("Chỉ disputeContract mới được quyền gọi burnGameTheoryDeposits", async function () {
            const { auction, buyer1 } = await networkHelpers.loadFixture(setupDisputeFixture);

            // Ví người dùng gọi -> Phải báo lỗi
            await viem.assertions.revertWith(
                auction.write.burnGameTheoryDeposits([1n], { account: buyer1.account }),
                "Only DisputeResolution"
            );
        });

        it("burnGameTheoryDeposits đốt sạch tiền cọc và bid, trả NFT về cho Seller", async function () {
            const { adf, nft, auction, seller, disputeContractMock, reservePrice } = await networkHelpers.loadFixture(setupDisputeFixture);

            // Kiểm tra số dư ADF của địa chỉ 0xdead trước khi đốt
            const deadAddress = "0x000000000000000000000000000000000000dead";
            const deadBalanceBefore = await adf.read.balanceOf([deadAddress]);

            // Gọi đốt từ ví disputeContractMock
            await auction.write.burnGameTheoryDeposits([1n], { account: disputeContractMock.account });

            // Tổng tiền bị đốt: 500 (bid) + 500 (sellerDeposit) + 500 (buyerDeposit) = 1500 ADF
            const deadBalanceAfter = await adf.read.balanceOf([deadAddress]);
            assert.equal(deadBalanceAfter - deadBalanceBefore, reservePrice * 3n);

            // NFT phải được hoàn trả về cho seller
            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), seller.account.address.toLowerCase());

            const auctionDetails = await auction.read.auctions([1n]);
            assert.equal(auctionDetails[10], PHASE_RESOLVED); // phase = RESOLVED
            assert.equal(auctionDetails[7], false); // active = false
            assert.equal(auctionDetails[13], 0n); // sellerDeposit = 0
            assert.equal(auctionDetails[14], 0n); // buyerDeposit = 0
        });
    });
});
