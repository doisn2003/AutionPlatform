// @ts-nocheck
import { network } from "hardhat";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("ADF Token", async function () {
    const { viem, networkHelpers } = await network.create();

    async function deployADF() {
        const [owner, user1, user2] = await viem.getWalletClients();
        const adf = await viem.deployContract("ADF");
        return { adf, owner, user1, user2 };
    }

    describe("Khởi tạo Deployment", function () {
        it("Kiểm tra tên và ký hiệu token", async function () {
            const { adf } = await networkHelpers.loadFixture(deployADF);
            assert.equal(await adf.read.name(), "Auction Decentralized Free");
            assert.equal(await adf.read.symbol(), "ADF");
        });

        it("Tổng cung ban đầu được đúc cho Deployer", async function () {
            const { adf, owner } = await networkHelpers.loadFixture(deployADF);
            const decimals = await adf.read.decimals();
            const expectedSupply = 1000000n * 10n ** BigInt(decimals);
            
            assert.equal(await adf.read.totalSupply(), expectedSupply);
            
            const ownerBalance = await adf.read.balanceOf([owner.account.address]);
            assert.equal(ownerBalance, expectedSupply);
        });
    });

    describe("Tính năng Faucet", function () {
        it("Cho phép người dùng gọi faucet nhận 100 ADF", async function () {
            const { adf, user1 } = await networkHelpers.loadFixture(deployADF);
            
            const decimals = await adf.read.decimals();
            const hundredADF = 100n * 10n ** BigInt(decimals);
            
            await adf.write.faucet({ account: user1.account });
            
            const user1Balance = await adf.read.balanceOf([user1.account.address]);
            assert.equal(user1Balance, hundredADF);
        });
    });

    describe("Tính năng ERC20 Tiêu chuẩn", function () {
        it("Người dùng có thể chuyển token", async function () {
            const { adf, owner, user1 } = await networkHelpers.loadFixture(deployADF);
            
            const decimals = await adf.read.decimals();
            const transferAmount = 100n * 10n ** BigInt(decimals);

            await adf.write.transfer([user1.account.address, transferAmount], { account: owner.account });

            const user1Balance = await adf.read.balanceOf([user1.account.address]);
            assert.equal(user1Balance, transferAmount);
        });

        it("Cơ chế ủy quyền (Approve / TransferFrom) hoạt động đúng", async function () {
            const { adf, owner, user1, user2 } = await networkHelpers.loadFixture(deployADF);
            
            const decimals = await adf.read.decimals();
            const transferAmount = 50n * 10n ** BigInt(decimals);

            // Owner ủy quyền cho User1
            await adf.write.approve([user1.account.address, transferAmount], { account: owner.account });

            // User1 dùng quyền đó để chuyển tiền từ Owner sang User2
            await adf.write.transferFrom(
                [owner.account.address, user2.account.address, transferAmount], 
                { account: user1.account }
            );

            const user2Balance = await adf.read.balanceOf([user2.account.address]);
            assert.equal(user2Balance, transferAmount);
        });
    });
});
