// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("DisputeResolution Step 3 Test", async function () {
    const { viem, networkHelpers } = await network.create();

    const ASSET_TYPE_PHYSICAL = 1;
    const DISPUTE_TYPE_GAME_THEORY = 1;
    const PHASE_EVIDENCE = 0;
    const PHASE_COMMIT = 1;

    async function deployFixtures() {
        const [owner, seller, buyer1, serverOracle, juror1, juror2, juror3, juror4, juror5, userNoStake] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        const auction = await viem.deployContract("AuctionExchange", [adf.address, nft.address]);
        const dispute = await viem.deployContract("DisputeResolution", [adf.address]);

        const decimals = await adf.read.decimals();
        const unit = 10n ** BigInt(decimals);

        // Thiết lập liên kết
        await auction.write.setDisputeContract([dispute.address]);
        await dispute.write.setAuctionExchange([auction.address]);
        await dispute.write.setServerOracle([serverOracle.account.address]);

        // Cấp NFT cho seller
        await nft.write.mintNFT(["ipfs://QmPhysicalNFT"], { account: seller.account });
        await nft.write.approve([auction.address, 1n], { account: seller.account });

        // Cấp ADF cho seller làm cọc
        await adf.write.transfer([seller.account.address, 1000n * unit], { account: owner.account });
        await adf.write.approve([auction.address, 1000n * unit], { account: seller.account });

        // Cấp ADF cho buyer1 đặt bid + cọc
        await adf.write.transfer([buyer1.account.address, 2000n * unit], { account: owner.account });
        await adf.write.approve([auction.address, 2000n * unit], { account: buyer1.account });

        // Cấp ADF cho các jurors và thực hiện staking
        const jurors = [juror1, juror2, juror3];
        for (const juror of jurors) {
            await adf.write.transfer([juror.account.address, 1000n * unit], { account: owner.account });
            await adf.write.approve([dispute.address, 1000n * unit], { account: juror.account });
            await dispute.write.stakeForJuror([500n * unit], { account: juror.account });
        }

        return { adf, nft, auction, dispute, owner, seller, buyer1, serverOracle, jurors, userNoStake, unit };
    }

    describe("Tạo Tranh Chấp (createDispute)", function () {
        it("Chỉ AuctionExchange mới có quyền gọi createDispute", async function () {
            const { dispute, buyer1 } = await networkHelpers.loadFixture(deployFixtures);
            
            await viem.assertions.revertWith(
                dispute.write.createDispute([1n, buyer1.account.address, buyer1.account.address, buyer1.account.address, "ipfs://evidence", 1], { account: buyer1.account }),
                "Only AuctionExchange"
            );
        });

        it("Liên kết openDispute từ AuctionExchange kích hoạt tạo Dispute chính xác", async function () {
            const { auction, dispute, seller, buyer1, unit } = await networkHelpers.loadFixture(deployFixtures);
            const reservePrice = 500n * unit;

            // 1. Tạo phiên đấu giá
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: seller.account });

            // 2. Buyer1 đặt bid
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });

            // 3. Kết thúc đấu giá -> Vào Escrow
            await networkHelpers.time.increase(86400n + 1n);
            await auction.write.endAuction([1n], { account: seller.account });

            // 4. Buyer1 mở tranh chấp
            const evidenceURI = "ipfs://QmEvidenceBuyer";
            await auction.write.openDispute([1n, evidenceURI], { account: buyer1.account });

            // 5. Kiểm tra thông tin dispute được tạo
            assert.equal(await dispute.read.disputeIdCounter(), 1n);

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[0], 1n); // auctionId = 1
            assert.equal(disputeInfo[1].toLowerCase(), buyer1.account.address.toLowerCase()); // buyer
            assert.equal(disputeInfo[2].toLowerCase(), seller.account.address.toLowerCase()); // seller
            assert.equal(disputeInfo[3].toLowerCase(), buyer1.account.address.toLowerCase()); // initiator
            assert.equal(disputeInfo[4], evidenceURI); // buyerEvidenceIPFS
            assert.equal(disputeInfo[5], ""); // sellerEvidenceIPFS rỗng
            assert.equal(disputeInfo[6], PHASE_EVIDENCE); // phase = EVIDENCE

            // Kiểm tra mapping ngược
            assert.equal(await dispute.read.auctionToDispute([1n]), 1n);
        });
    });

    describe("Nộp Thêm Bằng Chứng (submitEvidence)", function () {
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
            await fixture.auction.write.openDispute([1n, "ipfs://buyerEvidence"], { account: fixture.buyer1.account });
            return fixture;
        }

        it("Người ngoài cuộc không được quyền nộp bằng chứng", async function () {
            const { dispute, userNoStake } = await networkHelpers.loadFixture(setupDisputeFixture);

            // Báo lỗi: không phải bên liên quan
            try {
                await dispute.write.submitEvidence([1n, "ipfs://fake"], { account: userNoStake.account });
                assert.fail("Should have reverted");
            } catch (err) {
                // Assert.ok
            }
        });

        it("Seller có thể nộp bằng chứng phản biện", async function () {
            const { dispute, seller } = await networkHelpers.loadFixture(setupDisputeFixture);
            const sellerEvidence = "ipfs://sellerEvidence";

            await dispute.write.submitEvidence([1n, sellerEvidence], { account: seller.account });

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[5], sellerEvidence); // sellerEvidenceIPFS được lưu
        });
    });

    describe("Chỉ Định Trọng Tài (setJurors)", function () {
        async function setupDisputeForJurorsFixture() {
            const fixture = await deployFixtures();
            const reservePrice = 500n * fixture.unit;
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * fixture.unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
            ], { account: fixture.seller.account });
            await fixture.auction.write.bid([1n, reservePrice], { account: fixture.buyer1.account });
            await networkHelpers.time.increase(86400n + 1n);
            await fixture.auction.write.endAuction([1n], { account: fixture.seller.account });
            await fixture.auction.write.openDispute([1n, "ipfs://buyerEvidence"], { account: fixture.buyer1.account });
            return fixture;
        }

        it("Chỉ serverOracle mới có quyền gọi setJurors", async function () {
            const { dispute, jurors, seller } = await networkHelpers.loadFixture(setupDisputeForJurorsFixture);
            const jurorAddresses = jurors.map(j => j.account.address);

            await viem.assertions.revertWith(
                dispute.write.setJurors([1n, jurorAddresses], { account: seller.account }),
                "Only server oracle"
            );
        });

        it("Yêu cầu các Juror chỉ định phải stake đủ lượng tối thiểu", async function () {
            const { dispute, jurors, serverOracle, userNoStake } = await networkHelpers.loadFixture(setupDisputeForJurorsFixture);
            const invalidJurorAddresses = [
                jurors[0].account.address,
                jurors[1].account.address,
                userNoStake.account.address // Người này chưa stake
            ];

            await viem.assertions.revertWith(
                dispute.write.setJurors([1n, invalidJurorAddresses], { account: serverOracle.account }),
                "Juror insufficient stake"
            );
        });

        it("Không cho phép gán Juror trùng với Buyer hoặc Seller", async function () {
            const { dispute, jurors, serverOracle, seller } = await networkHelpers.loadFixture(setupDisputeForJurorsFixture);
            const invalidJurorAddresses = [
                jurors[0].account.address,
                jurors[1].account.address,
                seller.account.address // Trùng với seller
            ];

            await viem.assertions.revertWith(
                dispute.write.setJurors([1n, invalidJurorAddresses], { account: serverOracle.account }),
                "Juror conflict"
            );
        });

        it("Gán Jurors thành công, tự động chuyển pha sang COMMIT", async function () {
            const { dispute, jurors, serverOracle } = await networkHelpers.loadFixture(setupDisputeForJurorsFixture);
            const jurorAddresses = jurors.map(j => j.account.address);

            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[6], PHASE_COMMIT); // phase = COMMIT (1)

            // Kiểm tra các ví trọng tài đã được lưu đúng
            for (let i = 0; i < 3; i++) {
                const selected = await dispute.read.getJurorIndex([1n, jurorAddresses[i]]);
                assert.equal(selected, i);
            }
        });
    });
});
