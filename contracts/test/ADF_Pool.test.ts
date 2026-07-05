// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ADF_Pool", async function () {
    const { viem, networkHelpers } = await network.create();

    async function deployFixtures() {
        const [owner, disputeContract, user1, user2] = await viem.getWalletClients();
        
        const adf = await viem.deployContract("ADF");
        const pool = await viem.deployContract("ADF_Pool", [
            adf.address,
            owner.account.address
        ]);

        const decimals = await adf.read.decimals();
        const unit = 10n ** BigInt(decimals);

        // Faucet and approve for user1
        await adf.write.faucet({ account: user1.account });
        await adf.write.faucet({ account: user1.account }); // 20 ADF
        await adf.write.approve([pool.address, 20n * unit], { account: user1.account });

        // Approve for owner to add liquidity
        const initialADF = 100000n * unit; // 100k ADF
        await adf.write.approve([pool.address, initialADF], { account: owner.account });

        return { adf, pool, owner, disputeContract, user1, user2, decimals, unit };
    }

    describe("Deployment & Config", function () {
        it("Khởi tạo chính xác địa chỉ token và owner", async function () {
            const { adf, pool, owner } = await networkHelpers.loadFixture(deployFixtures);
            assert.equal((await pool.read.adfToken()).toLowerCase(), adf.address.toLowerCase());
            assert.equal((await pool.read.owner()).toLowerCase(), owner.account.address.toLowerCase());
        });

        it("Chỉ Owner mới có thể set dispute contract", async function () {
            const { pool, disputeContract, user1 } = await networkHelpers.loadFixture(deployFixtures);
            
            // User1 calls setDisputeContract should fail
            try {
                await pool.write.setDisputeContract([disputeContract.account.address], { account: user1.account });
                assert.fail("Should have reverted");
            } catch (err) {
                assert.ok(err.message.includes("OwnableUnauthorizedAccount"), "Expected OwnableUnauthorizedAccount error");
            }

            // Owner calls should succeed
            await pool.write.setDisputeContract([disputeContract.account.address]);
            assert.equal((await pool.read.disputeContract()).toLowerCase(), disputeContract.account.address.toLowerCase());
        });
    });

    describe("Liquidity Provision", function () {
        it("Chỉ Owner mới có thể nạp thanh khoản ban đầu", async function () {
            const { pool, user1, unit } = await networkHelpers.loadFixture(deployFixtures);
            
            try {
                await pool.write.addLiquidity([10n * unit], { account: user1.account, value: 10n * unit });
                assert.fail("Should have reverted");
            } catch (err) {
                assert.ok(err.message.includes("OwnableUnauthorizedAccount"), "Expected OwnableUnauthorizedAccount error");
            }
        });

        it("Nạp thanh khoản ban đầu thành công và thiết lập K", async function () {
            const { adf, pool, owner, unit } = await networkHelpers.loadFixture(deployFixtures);
            
            const ethAmount = 10n * 10n ** 18n; // 10 ETH
            const adfAmount = 100000n * unit;  // 100k ADF

            await pool.write.addLiquidity([adfAmount], { account: owner.account, value: ethAmount });

            assert.equal(await pool.read.reserveETH(), ethAmount);
            assert.equal(await pool.read.reserveADF(), adfAmount);
            assert.equal(await pool.read.K(), ethAmount * adfAmount);
            
            // Check price of 1 ADF in ETH: price = reserveETH * 1e18 / reserveADF
            // price = 10 ETH * 1e18 / 100000 ADF = 1e14 wei = 0.0001 ETH
            const expectedPrice = (ethAmount * 10n ** 18n) / adfAmount;
            assert.equal(await pool.read.getPrice(), expectedPrice);
        });
    });

    describe("AMM Swaps", function () {
        async function loadLiquidityFixture() {
            const fixture = await deployFixtures();
            const ethAmount = 10n * 10n ** 18n; // 10 ETH
            const adfAmount = 100000n * fixture.unit; // 100k ADF
            await fixture.pool.write.addLiquidity([adfAmount], { account: fixture.owner.account, value: ethAmount });
            return { ...fixture, ethAmount, adfAmount };
        }

        it("Swap ETH lấy ADF thành công (swapETHForADF)", async function () {
            const { adf, pool, user1, unit, ethAmount, adfAmount } = await networkHelpers.loadFixture(loadLiquidityFixture);
            
            const inputETH = 1n * 10n ** 18n; // 1 ETH
            const feeETH = (inputETH * 3n) / 1000n; // 0.003 ETH
            const ethInAfterFee = inputETH - feeETH;

            const expectedNewReserveETH = ethAmount + ethInAfterFee;
            const expectedNewReserveADF = (ethAmount * adfAmount) / expectedNewReserveETH;
            const expectedADFOut = adfAmount - expectedNewReserveADF;

            // Get amount out from view function
            const amountOut = await pool.read.getAmountOut([inputETH, true]);
            assert.equal(amountOut, expectedADFOut);

            // Execute Swap
            const balanceBefore = await adf.read.balanceOf([user1.account.address]);
            await pool.write.swapETHForADF([0n], { account: user1.account, value: inputETH });
            const balanceAfter = await adf.read.balanceOf([user1.account.address]);

            assert.equal(balanceAfter - balanceBefore, expectedADFOut);
            
            // Check pool reserves
            // reserveETH should be ethAmount + inputETH (since fee is kept in pool)
            assert.equal(await pool.read.reserveETH(), ethAmount + inputETH);
            assert.equal(await pool.read.reserveADF(), expectedNewReserveADF);
            assert.equal(await pool.read.K(), (ethAmount + inputETH) * expectedNewReserveADF);
        });

        it("Swap ADF lấy ETH thành công (swapADFForETH)", async function () {
            const { adf, pool, user1, unit, ethAmount, adfAmount } = await networkHelpers.loadFixture(loadLiquidityFixture);
            
            const inputADF = 10n * unit; // 10 ADF
            const feeADF = (inputADF * 3n) / 1000n; // 0.03 ADF
            const adfInAfterFee = inputADF - feeADF;

            const expectedNewReserveADF = adfAmount + adfInAfterFee;
            const expectedNewReserveETH = (ethAmount * adfAmount) / expectedNewReserveADF;
            const expectedETHOut = ethAmount - expectedNewReserveETH;

            // Get amount out from view function
            const amountOut = await pool.read.getAmountOut([inputADF, false]);
            assert.equal(amountOut, expectedETHOut);

            // Execute Swap
            const publicClient = await viem.getPublicClient();
            const ethBalanceBefore = await publicClient.getBalance({ address: user1.account.address });
            
            // Submit swap
            await pool.write.swapADFForETH([inputADF, 0n], { account: user1.account });

            const ethBalanceAfter = await publicClient.getBalance({ address: user1.account.address });
            assert.ok(ethBalanceAfter > ethBalanceBefore, "User should have received ETH");

            // reserveADF should be adfAmount + inputADF (since fee is kept in pool)
            assert.equal(await pool.read.reserveADF(), adfAmount + inputADF);
            assert.equal(await pool.read.reserveETH(), expectedNewReserveETH);
            assert.equal(await pool.read.K(), (adfAmount + inputADF) * expectedNewReserveETH);
        });

        it("Biến động tỷ giá (trượt giá) khi hai người dùng mua liên tiếp cùng lượng ETH", async function () {
            const { adf, pool, user1, user2, unit, ethAmount, adfAmount } = await networkHelpers.loadFixture(loadLiquidityFixture);
            
            const initialPrice = await pool.read.getPrice();
            const inputETH = 1n * 10n ** 18n; // 1 ETH mỗi người
            
            // Người thứ nhất swap 1 ETH
            const balBefore1 = await adf.read.balanceOf([user1.account.address]);
            await pool.write.swapETHForADF([0n], { account: user1.account, value: inputETH });
            const balAfter1 = await adf.read.balanceOf([user1.account.address]);
            const adfReceived1 = balAfter1 - balBefore1;
            
            const priceAfter1 = await pool.read.getPrice();
            
            // Người thứ hai swap 1 ETH
            const balBefore2 = await adf.read.balanceOf([user2.account.address]);
            await pool.write.swapETHForADF([0n], { account: user2.account, value: inputETH });
            const balAfter2 = await adf.read.balanceOf([user2.account.address]);
            const adfReceived2 = balAfter2 - balBefore2;
            
            const priceAfter2 = await pool.read.getPrice();

            // KIỂM TRA BIẾN ĐỘNG TỶ GIÁ:
            // 1. Giá ADF sau mỗi lần swap phải tăng lên (tính bằng ETH per ADF)
            assert.ok(priceAfter1 > initialPrice, "Giá phải tăng sau lượt swap đầu tiên");
            assert.ok(priceAfter2 > priceAfter1, "Giá của người thứ hai phải đắt hơn người thứ nhất");
            
            // 2. Người thứ hai phải nhận được ít ADF hơn người thứ nhất cho cùng 1 ETH
            assert.ok(adfReceived2 < adfReceived1, "Người thứ hai nhận được ít ADF hơn do trượt giá");
            
            console.log(`\n      [TEST TỶ GIÁ]`);
            console.log(`      -> Giá ban đầu: 1 ADF = ${Number(initialPrice) / 1e18} ETH`);
            console.log(`      -> Người 1 nhận: ${Number(adfReceived1) / Number(unit)} ADF | Giá sau đó: 1 ADF = ${Number(priceAfter1) / 1e18} ETH`);
            console.log(`      -> Người 2 nhận: ${Number(adfReceived2) / Number(unit)} ADF | Giá sau đó: 1 ADF = ${Number(priceAfter2) / 1e18} ETH`);
        });
    });

    describe("Juror Rewards Withdrawals", function () {
        async function loadLiquidityFixture() {
            const fixture = await deployFixtures();
            const ethAmount = 10n * 10n ** 18n; // 10 ETH
            const adfAmount = 100000n * fixture.unit; // 100k ADF
            await fixture.pool.write.addLiquidity([adfAmount], { account: fixture.owner.account, value: ethAmount });
            await fixture.pool.write.setDisputeContract([fixture.disputeContract.account.address]);
            return { ...fixture, ethAmount, adfAmount };
        }

        it("Chỉ disputeContract mới có thể gọi withdrawJurorReward", async function () {
            const { pool, user1, unit } = await networkHelpers.loadFixture(loadLiquidityFixture);
            await viem.assertions.revertWith(
                pool.write.withdrawJurorReward([50n * unit], { account: user1.account }),
                "Only DisputeResolution"
            );
        });

        it("withdrawJurorReward thành công trích trực tiếp từ reserves", async function () {
            const { adf, pool, disputeContract, unit, adfAmount, ethAmount } = await networkHelpers.loadFixture(loadLiquidityFixture);
            
            const rewardAmount = 50n * unit;
            
            const balanceBefore = await adf.read.balanceOf([disputeContract.account.address]);
            await pool.write.withdrawJurorReward([rewardAmount], { account: disputeContract.account });
            const balanceAfter = await adf.read.balanceOf([disputeContract.account.address]);

            assert.equal(balanceAfter - balanceBefore, rewardAmount);
            
            // reserveADF must decrease by rewardAmount
            assert.equal(await pool.read.reserveADF(), adfAmount - rewardAmount);
            // K must update: K = reserveETH * (reserveADF - rewardAmount)
            assert.equal(await pool.read.K(), ethAmount * (adfAmount - rewardAmount));
        });
    });
});
