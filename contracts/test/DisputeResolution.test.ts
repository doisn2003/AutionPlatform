// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("DisputeResolution Staking Test", async function () {
    const { viem, networkHelpers } = await network.create();

    async function deployFixtures() {
        const [owner, juror1, juror2] = await viem.getWalletClients();
        const adf = await viem.deployContract("ADF");
        const dispute = await viem.deployContract("DisputeResolution", [adf.address]);

        const decimals = await adf.read.decimals();
        const unit = 10n ** BigInt(decimals);

        // Chuyển token từ owner sang cho juror1 và juror2 để họ stake
        const initialFunds = 1000n * unit; // 1000 ADF
        await adf.write.transfer([juror1.account.address, initialFunds], { account: owner.account });
        await adf.write.transfer([juror2.account.address, initialFunds], { account: owner.account });

        // Approve cho dispute contract chi tiêu
        await adf.write.approve([dispute.address, initialFunds], { account: juror1.account });
        await adf.write.approve([dispute.address, initialFunds], { account: juror2.account });

        return { adf, dispute, owner, juror1, juror2, unit };
    }

    describe("Deployment & Config", function () {
        it("Khởi tạo chính xác địa chỉ ADF Token", async function () {
            const { adf, dispute } = await networkHelpers.loadFixture(deployFixtures);
            assert.equal((await dispute.read.adfToken()).toLowerCase(), adf.address.toLowerCase());
        });

        it("Đọc đúng các hằng số Staking", async function () {
            const { dispute, unit } = await networkHelpers.loadFixture(deployFixtures);
            assert.equal(await dispute.read.MIN_JUROR_STAKE(), 500n * unit);
            assert.equal(await dispute.read.JUROR_REWARD(), 50n * unit);
            assert.equal(await dispute.read.JUROR_PENALTY(), 100n * unit);
            assert.equal(await dispute.read.NUM_JURORS(), 5n);
        });
    });

    describe("Staking (stakeForJuror)", function () {
        it("Không cho phép stake nhỏ hơn MIN_JUROR_STAKE", async function () {
            const { dispute, unit, juror1 } = await networkHelpers.loadFixture(deployFixtures);
            const lowAmount = 499n * unit;

            await viem.assertions.revertWith(
                dispute.write.stakeForJuror([lowAmount], { account: juror1.account }),
                "Must stake >= 500 ADF"
            );
        });

        it("Cho phép stake từ MIN_JUROR_STAKE trở lên thành công", async function () {
            const { adf, dispute, unit, juror1 } = await networkHelpers.loadFixture(deployFixtures);
            const stakeAmount = 500n * unit;

            // Kiểm tra số dư trước khi stake
            const balanceBefore = await adf.read.balanceOf([juror1.account.address]);

            await dispute.write.stakeForJuror([stakeAmount], { account: juror1.account });

            // Kiểm tra số dư mapping jurorStakes
            const stakedAmount = await dispute.read.jurorStakes([juror1.account.address]);
            assert.equal(stakedAmount, stakeAmount);

            // Kiểm tra số dư token của juror giảm đi
            const balanceAfter = await adf.read.balanceOf([juror1.account.address]);
            assert.equal(balanceBefore - balanceAfter, stakeAmount);

            // Kiểm tra số dư token của contract tăng lên
            const contractBalance = await adf.read.balanceOf([dispute.address]);
            assert.equal(contractBalance, stakeAmount);
        });
    });

    describe("Unstaking (unstakeJuror)", function () {
        it("Không cho phép rút nhiều hơn số dư đã stake", async function () {
            const { dispute, unit, juror1 } = await networkHelpers.loadFixture(deployFixtures);
            const stakeAmount = 500n * unit;
            
            // Stake 500 ADF
            await dispute.write.stakeForJuror([stakeAmount], { account: juror1.account });

            // Rút 501 ADF -> báo lỗi
            await viem.assertions.revertWith(
                dispute.write.unstakeJuror([501n * unit], { account: juror1.account }),
                "Insufficient stake"
            );
        });

        it("Cho phép rút thành công khi số dư stake hợp lệ", async function () {
            const { adf, dispute, unit, juror1 } = await networkHelpers.loadFixture(deployFixtures);
            const stakeAmount = 600n * unit;
            const withdrawAmount = 200n * unit;

            // Stake 600 ADF
            await dispute.write.stakeForJuror([stakeAmount], { account: juror1.account });

            const balanceAfterStake = await adf.read.balanceOf([juror1.account.address]);

            // Rút 200 ADF
            await dispute.write.unstakeJuror([withdrawAmount], { account: juror1.account });

            // Kiểm tra mapping jurorStakes còn lại 400 ADF
            const stakedRemaining = await dispute.read.jurorStakes([juror1.account.address]);
            assert.equal(stakedRemaining, 400n * unit);

            // Kiểm tra token trả về ví juror1
            const balanceAfterWithdraw = await adf.read.balanceOf([juror1.account.address]);
            assert.equal(balanceAfterWithdraw - balanceAfterStake, withdrawAmount);

            // Kiểm tra token trong contract còn 400 ADF
            const contractBalance = await adf.read.balanceOf([dispute.address]);
            assert.equal(contractBalance, 400n * unit);
        });
    });
});
