// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { keccak256, encodePacked } from "viem";

describe("DisputeResolution Step 4 Test", async function () {
    const { viem, networkHelpers } = await network.create();

    const ASSET_TYPE_PHYSICAL = 1;
    const DISPUTE_TYPE_GAME_THEORY = 1;
    const PHASE_COMMIT = 1;
    const PHASE_REVEAL = 2;

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
        const jurors = [juror1, juror2, juror3, juror4, juror5];
        for (const juror of jurors) {
            await adf.write.transfer([juror.account.address, 1000n * unit], { account: owner.account });
            await adf.write.approve([dispute.address, 1000n * unit], { account: juror.account });
            await dispute.write.stakeForJuror([500n * unit], { account: juror.account });
        }

        // Tạo sẵn phiên đấu giá, kết thúc và mở tranh chấp để làm nền cho các test case sau
        const reservePrice = 500n * unit;
        await auction.write.createAuction([
            1n, 86400n, reservePrice, 50n * unit, 
            ASSET_TYPE_PHYSICAL, DISPUTE_TYPE_GAME_THEORY, 86400n
        ], { account: seller.account });
        await auction.write.bid([1n, reservePrice], { account: buyer1.account });
        await networkHelpers.time.increase(86400n + 1n);
        await auction.write.endAuction([1n], { account: seller.account });
        await auction.write.openDispute([1n, "ipfs://buyerEvidence"], { account: buyer1.account });

        return { adf, nft, auction, dispute, owner, seller, buyer1, serverOracle, jurors, userNoStake, unit };
    }

    // Helper tạo commit hash bằng keccak256
    function createCommitHash(vote: number, salt: string) {
        return keccak256(
            encodePacked(["uint8", "string"], [vote, salt])
        );
    }

    describe("Bỏ Phiếu Kín (commitVote)", function () {
        it("Chỉ Trọng tài được chỉ định mới được phép commitVote", async function () {
            const { dispute, userNoStake, jurors, serverOracle } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });

            const hash = createCommitHash(1, "secret1");
            
            await viem.assertions.revertWith(
                dispute.write.commitVote([1n, hash], { account: userNoStake.account }),
                "Not selected juror"
            );
        });

        it("Không cho phép commitVote khi tranh chấp chưa ở pha COMMIT", async function () {
            const { dispute, jurors } = await networkHelpers.loadFixture(deployFixtures);
            const hash = createCommitHash(1, "secret1");

            // Lúc này chưa gọi setJurors nên vẫn đang ở pha EVIDENCE
            await viem.assertions.revertWith(
                dispute.write.commitVote([1n, hash], { account: jurors[0].account }),
                "Wrong phase"
            );
        });

        it("Juror commit thành công và không được phép commit lần 2", async function () {
            const { dispute, jurors, serverOracle } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);
            
            // Gán jurors để sang COMMIT phase
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });
            
            const hash = createCommitHash(1, "secret1");
            await dispute.write.commitVote([1n, hash], { account: jurors[0].account });

            // Kiểm tra hasCommitted là true qua getDisputeJurorInfo
            const jurorInfo = await dispute.read.getDisputeJurorInfo([1n, jurors[0].account.address]);
            assert.equal(jurorInfo[0], true);

            // Thử commit lần 2 phải bị từ chối
            await viem.assertions.revertWith(
                dispute.write.commitVote([1n, hash], { account: jurors[0].account }),
                "Already committed"
            );
        });

        it("Tự động chuyển sang pha REVEAL khi cả 5 jurors đã commit xong", async function () {
            const { dispute, jurors, serverOracle } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });

            for (let i = 0; i < 5; i++) {
                const hash = createCommitHash(1, `secret${i}`);
                await dispute.write.commitVote([1n, hash], { account: jurors[i].account });
            }

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[6], PHASE_REVEAL); // Phase = REVEAL (2)
        });
    });

    describe("Cập Nhật Pha theo Thời Gian (checkAndUpdatePhase)", function () {
        it("Chuyển pha tự động sang REVEAL khi hết hạn commitDeadline", async function () {
            const { dispute, jurors, serverOracle } = await networkHelpers.loadFixture(deployFixtures);
            const jurorAddresses = jurors.map(j => j.account.address);
            await dispute.write.setJurors([1n, jurorAddresses], { account: serverOracle.account });

            // Chỉ có 3 jurors commit phiếu
            await dispute.write.commitVote([1n, createCommitHash(1, "sec0")], { account: jurors[0].account });
            await dispute.write.commitVote([1n, createCommitHash(2, "sec1")], { account: jurors[1].account });
            await dispute.write.commitVote([1n, createCommitHash(1, "sec2")], { account: jurors[2].account });

            // Tua thời gian vượt quá commitDeadline (2 ngày)
            await networkHelpers.time.increase(2 * 86400 + 10);

            // Gọi checkAndUpdatePhase
            await dispute.write.checkAndUpdatePhase([1n]);

            const disputeInfo = await dispute.read.disputes([1n]);
            assert.equal(disputeInfo[6], PHASE_REVEAL); // phase = REVEAL
        });
    });

    describe("Mở Phiếu (revealVote)", function () {
        async function setupCommitPhaseFixture() {
            const fixture = await deployFixtures();
            const jurorAddresses = fixture.jurors.map(j => j.account.address);
            await fixture.dispute.write.setJurors([1n, jurorAddresses], { account: fixture.serverOracle.account });
            return fixture;
        }

        it("Juror không được phép gọi revealVote khi đang ở pha COMMIT", async function () {
            const { dispute, jurors } = await networkHelpers.loadFixture(setupCommitPhaseFixture);
            const hash = createCommitHash(1, "secret1");
            await dispute.write.commitVote([1n, hash], { account: jurors[0].account });

            await viem.assertions.revertWith(
                dispute.write.revealVote([1n, 1, "secret1"], { account: jurors[0].account }),
                "Wrong phase"
            );
        });

        it("Báo lỗi nếu mở phiếu sai mật khẩu Salt hoặc lựa chọn", async function () {
            const { dispute, jurors } = await networkHelpers.loadFixture(setupCommitPhaseFixture);
            
            // Cả 5 jurors commit
            for (let i = 0; i < 5; i++) {
                const hash = createCommitHash(1, `secret${i}`);
                await dispute.write.commitVote([1n, hash], { account: jurors[i].account });
            }

            // Mở phiếu sai salt -> revert
            await viem.assertions.revertWith(
                dispute.write.revealVote([1n, 1, "wrong_salt"], { account: jurors[0].account }),
                "Hash mismatch"
            );

            // Mở phiếu sai lựa chọn -> revert
            await viem.assertions.revertWith(
                dispute.write.revealVote([1n, 2, "secret0"], { account: jurors[0].account }),
                "Hash mismatch"
            );
        });

        it("Mở phiếu thành công, cập nhật số phiếu bầu chính xác cho các bên", async function () {
            const { dispute, jurors } = await networkHelpers.loadFixture(setupCommitPhaseFixture);
            
            // Commit phiếu: 3 người chọn Buyer (1), 2 người chọn Seller (2)
            const votes = [1, 2, 1, 2, 1];
            const salts = ["s0", "s1", "s2", "s3", "s4"];
            for (let i = 0; i < 5; i++) {
                const hash = createCommitHash(votes[i], salts[i]);
                await dispute.write.commitVote([1n, hash], { account: jurors[i].account });
            }

            // Lúc này tự chuyển sang pha REVEAL, thực hiện reveal
            await dispute.write.revealVote([1n, votes[0], salts[0]], { account: jurors[0].account });
            await dispute.write.revealVote([1n, votes[1], salts[1]], { account: jurors[1].account });
            await dispute.write.revealVote([1n, votes[2], salts[2]], { account: jurors[2].account });

            const disputeInfo = await dispute.read.disputes([1n]);
            // Index 10: buyerVotes, Index 11: sellerVotes (các mảng được bỏ qua trong getter mặc định)
            assert.equal(disputeInfo[10], 2); // 2 phiếu cho buyer đã được reveal (juror0, juror2)
            assert.equal(disputeInfo[11], 1); // 1 phiếu cho seller đã được reveal (juror1)
        });
    });
});
