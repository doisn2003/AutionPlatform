import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, encodePacked } from "viem";

describe("DisputeResolution Step 5 Test", async function () {
    const { viem, networkHelpers } = await network.create();

    const ASSET_TYPE_PHYSICAL = 1;
    const DISPUTE_TYPE_JURY_VOTING = 2;
    const PHASE_RESOLVED = 3;

    async function deployFixtures() {
        const [owner, seller, buyer1, serverOracle, juror1, juror2, juror3, juror4, juror5, userNoStake] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const nft = await viem.deployContract("ADF_NFT", [owner.account.address]);
        const auction = await viem.deployContract("AuctionExchange", [adf.address, nft.address]);
        const dispute = await viem.deployContract("DisputeResolution", [adf.address]);
        const pool = await viem.deployContract("ADF_Pool", [adf.address, owner.account.address]);

        const decimals = await adf.read.decimals();
        const unit = 10n ** BigInt(decimals);

        // Thiết lập liên kết chéo
        await auction.write.setDisputeContract([dispute.address]);
        await dispute.write.setAuctionExchange([auction.address]);
        await dispute.write.setServerOracle([serverOracle.account.address]);
        await dispute.write.setAdfPool([pool.address]);
        await pool.write.setDisputeContract([dispute.address]);

        // Cấp thanh khoản ban đầu cho AMM Pool để trích tiền thưởng
        await adf.write.approve([pool.address, 10000n * unit], { account: owner.account });
        await pool.write.addLiquidity([10000n * unit], { value: 1n * unit, account: owner.account });

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
        const jurors = [juror1, juror2, juror3, juror4, juror5];
        for (const juror of jurors) {
            await adf.write.transfer([juror.account.address, 1000n * unit], { account: owner.account });
            await adf.write.approve([dispute.address, 1000n * unit], { account: juror.account });
            await dispute.write.stakeForJuror([500n * unit], { account: juror.account });
        }

        return { adf, nft, auction, dispute, pool, owner, seller, buyer1, serverOracle, jurors, userNoStake, unit };
    }

    // Helper tạo commit hash bằng keccak256
    function createCommitHash(vote: number, salt: string) {
        return keccak256(
            encodePacked(["uint8", "string"], [vote, salt])
        );
    }

    describe("Kiểm tra Ràng buộc resolveDispute", function () {
        it("Không cho phép gọi resolveDispute khi chưa hết hạn revealDeadline", async function () {
            const { dispute, jurors, serverOracle, unit } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);
            
            // Gán Trọng tài và nộp cọc
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });
            
            // Thực hiện commit hết cả 5 trọng tài -> sang REVEAL phase
            for (let i = 0; i < 5; i++) {
                await dispute.write.commitVote([1n, createCommitHash(1, `s${i}`)], { account: jurors[i].account });
            }

            // Gọi resolveDispute khi chưa hết hạn revealDeadline phải revert
            await viem.assertions.revertWith(
                dispute.write.resolveDispute([1n], { account: serverOracle.account }),
                "Reveal not ended"
            );
        });
    });

    describe("Phân Xử Tranh Chấp & Thưởng Phạt", function () {
        async function setupVotingFixture(votes: number[], salts: string[]) {
            const fixture = await deployFixtures();
            const jurorAddresses = fixture.jurors.map(j => j.account.address);
            
            // 1. Tạo phiên đấu giá, bid, end, và open dispute
            const reservePrice = 500n * fixture.unit;
            await fixture.auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * fixture.unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_JURY_VOTING, 86400n
            ], { account: fixture.seller.account });
            await fixture.auction.write.bid([1n, reservePrice], { account: fixture.buyer1.account });
            await networkHelpers.time.increase(86400n + 1n);
            await fixture.auction.write.endAuction([1n], { account: fixture.seller.account });
            await fixture.auction.write.openDispute([1n, "ipfs://buyerEvidence"], { account: fixture.buyer1.account });

            // 2. Gán jurors
            await fixture.dispute.write.setJurors([1n, jurorAddresses], { account: fixture.serverOracle.account });

            // 3. Commit votes
            for (let i = 0; i < 5; i++) {
                const hash = createCommitHash(votes[i], salts[i]);
                await fixture.dispute.write.commitVote([1n, hash], { account: fixture.jurors[i].account });
            }

            // 4. Reveal votes
            for (let i = 0; i < 5; i++) {
                await fixture.dispute.write.revealVote([1n, votes[i], salts[i]], { account: fixture.jurors[i].account });
            }

            // 5. Tua thời gian vượt qua revealDeadline (1 ngày)
            await networkHelpers.time.increase(86400n + 10n);

            return fixture;
        }

        it("Buyer Thắng (3 phiếu Buyer, 2 phiếu Seller) -> Phân phối cọc và phạt đúng", async function () {
            // Juror 0, 2, 4 vote Buyer (1); Juror 1, 3 vote Seller (2)
            const votes = [1, 2, 1, 2, 1];
            const salts = ["s0", "s1", "s2", "s3", "s4"];
            const { dispute, adf, nft, auction, pool, buyer1, seller, jurors, unit } = await setupVotingFixture(votes, salts);

            // Ghi nhận số dư trước khi resolve
            const poolBalBefore = await adf.read.balanceOf([pool.address]);
            
            // Gọi resolveDispute
            await dispute.write.resolveDispute([1n]);

            // 1. Kiểm tra trạng thái Dispute
            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[6], PHASE_RESOLVED); // phase = RESOLVED (3)
            assert.equal(disputeInfo[13], true); // resolved = true

            // 2. Kiểm tra tài sản trên AuctionExchange
            // Buyer thắng -> Hoàn bid + cọc cho Buyer. Trả NFT về Seller.
            const buyerPendingReturn = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(buyerPendingReturn, 500n * unit); // 500n bid (no deposit for JURY_VOTING)

            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), seller.account.address.toLowerCase()); // NFT về seller

            // 3. Kiểm tra Thưởng / Phạt Juror
            // Juror 0, 2, 4 đúng (+50) -> stake tăng từ 500 lên 550
            for (const i of [0, 2, 4]) {
                const stake = await dispute.read.jurorStakes([jurors[i].account.address]);
                assert.equal(stake, 550n * unit);
            }
            // Juror 1, 3 sai (-100) -> stake giảm từ 500 xuống 400
            for (const i of [1, 3]) {
                const stake = await dispute.read.jurorStakes([jurors[i].account.address]);
                assert.equal(stake, 400n * unit);
            }

            // Tiền phạt chuyển vào Pool AMM (+200 ADF), trích thưởng cho 3 trọng tài đúng (-150 ADF) -> Net +50 ADF
            const poolBalAfter = await adf.read.balanceOf([pool.address]);
            assert.equal(poolBalAfter, poolBalBefore + 50n * unit);
        });

        it("Seller Thắng (1 phiếu Buyer, 4 phiếu Seller) -> Phân phối cọc và NFT đúng", async function () {
            // Juror 0 vote Buyer (1); Juror 1, 2, 3, 4 vote Seller (2)
            const votes = [1, 2, 2, 2, 2];
            const salts = ["s0", "s1", "s2", "s3", "s4"];
            const { dispute, nft, auction, buyer1, seller, unit } = await setupVotingFixture(votes, salts);

            // Gọi resolveDispute
            await dispute.write.resolveDispute([1n]);

            // Seller thắng -> Chuyển bid + cọc cho Seller. Chuyển NFT cho Buyer.
            const sellerPendingReturn = await auction.read.pendingReturns([seller.account.address]);
            assert.equal(sellerPendingReturn, 500n * unit); // 500n bid (no deposit for JURY_VOTING)

            const nftOwner = await nft.read.ownerOf([1n]);
            assert.equal(nftOwner.toLowerCase(), buyer1.account.address.toLowerCase()); // NFT sang buyer
        });
    });

    describe("Trường hợp Bỏ Phiếu Trắng toàn bộ (Abstain)", function () {
        it("Tất cả Trọng tài không commit/reveal -> Mặc định Buyer thắng, không thưởng phạt", async function () {
            const { dispute, auction, buyer1, seller, serverOracle, jurors, unit } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);

            // 1. Tạo phiên đấu giá, bid, end, và open dispute
            const reservePrice = 500n * unit;
            await auction.write.createAuction([
                1n, 86400n, reservePrice, 50n * unit, 
                ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_JURY_VOTING, 86400n
            ], { account: seller.account });
            await auction.write.bid([1n, reservePrice], { account: buyer1.account });
            await networkHelpers.time.increase(86400n + 1n);
            await auction.write.endAuction([1n], { account: seller.account });
            await auction.write.openDispute([1n, "ipfs://buyerEvidence"], { account: buyer1.account });

            // Gán trọng tài sang COMMIT
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });

            // Tua thời gian bỏ qua cả pha COMMIT (2 ngày) và pha REVEAL (1 ngày) -> hết hạn không ai vote
            await networkHelpers.time.increase(3n * 86400n + 100n);

            // Chuyển pha thụ động bằng checkAndUpdatePhase
            await dispute.write.checkAndUpdatePhase([1n]);

            // Tua thời gian tiếp vượt qua revealDeadline vừa được kích hoạt
            await networkHelpers.time.increase(86400n + 10n);

            // Gọi resolveDispute
            await dispute.write.resolveDispute([1n]);

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[6], PHASE_RESOLVED); // phase = RESOLVED (3)

            // Đảm bảo không ai bị phạt (cọc các juror giữ nguyên 500)
            for (let i = 0; i < 5; i++) {
                const stake = await dispute.read.jurorStakes([jurorAddresses[i]]);
                assert.equal(stake, 500n * unit);
            }

            // Buyer thắng mặc định -> hoàn bid cho buyer
            const buyerPendingReturn = await auction.read.pendingReturns([buyer1.account.address]);
            assert.equal(buyerPendingReturn, 500n * unit);
        });
    });
});
