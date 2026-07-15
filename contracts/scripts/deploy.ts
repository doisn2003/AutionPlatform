// @ts-nocheck
/**
 * Deploy Script — Triển khai toàn bộ hệ thống Smart Contract
 * 
 * Thứ tự deploy:
 * 1. ADF (ERC20) — Đồng tiền thanh toán
 * 2. ADF_NFT (ERC721) — NFT vật phẩm
 * 3. AuctionExchange — Sàn đấu giá
 * 
 * Chạy: npx hardhat run scripts/deploy.ts --network localhost
 */

import hre from "hardhat";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const { viem } = await hre.network.connect();
  const [deployer] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  const sendTx = async (txPromise: Promise<`0x${string}`>, name: string) => {
    console.log(`   Sending transaction: ${name}...`);
    const hash = await txPromise;
    console.log(`      Tx Hash: ${hash}. Waiting for confirmation...`);
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`      ✅ Confirmed!`);
  };

  console.log("=========================================");
  console.log("🚀 BẮT ĐẦU TRIỂN KHAI HỢP ĐỒNG");
  console.log(`📍 Deployer: ${deployer.account.address}`);
  console.log("=========================================\n");

  // ---- Bước 1: Deploy ADF (ERC20) ----
  console.log("📦 [1/4] Deploying ADF Token (ERC20)...");
  const adf = await viem.deployContract("ADF");
  console.log(`   ✅ ADF deployed to: ${adf.address}\n`);

  // ---- Bước 2: Deploy ADF_Pool (AMM) ----
  console.log("📦 [2/4] Deploying ADF_Pool (AMM)...");
  const adfPool = await viem.deployContract("ADF_Pool", [
    adf.address,
    deployer.account.address
  ]);
  console.log(`   ✅ ADF_Pool deployed to: ${adfPool.address}\n`);

  // ---- Nạp thanh khoản ban đầu cho ADF_Pool ----
  console.log("💧 Adding initial liquidity to ADF_Pool...");
  const decimals = await adf.read.decimals();
  const adfAmount = 1000000n * 10n ** BigInt(decimals); // 1,000,000 ADF
  
  const isLocal = hre.network.name === "hardhat" || hre.network.name === "localhost";
  const ethAmount = isLocal ? (10n * 10n ** 18n) : (5n * 10n ** 17n); // 10 ETH for local, 0.5 ETH for Sepolia
  
  // Approve ADF
  await sendTx(
    adf.write.approve([adfPool.address, adfAmount], { account: deployer.account }),
    "Approve ADF for Pool"
  );
  // Add Liquidity
  await sendTx(
    adfPool.write.addLiquidity([adfAmount], { account: deployer.account, value: ethAmount }),
    "Add Liquidity to Pool"
  );
  console.log(`   ✅ Initial liquidity added: ${isLocal ? "10" : "0.5"} ETH + 1,000,000 ADF\n`);

  // ---- Bước 3: Deploy ADF_NFT (ERC721) ----
  console.log("📦 [3/5] Deploying ADF_NFT (ERC721)...");
  const adfNft = await viem.deployContract("ADF_NFT", [deployer.account.address]);
  console.log(`   ✅ ADF_NFT deployed to: ${adfNft.address}\n`);

  // ---- Bước 4: Deploy AuctionExchange ----
  console.log("📦 [4/5] Deploying AuctionExchange...");
  const auctionExchange = await viem.deployContract("AuctionExchange", [
    adf.address,
    adfNft.address,
  ]);
  console.log(`   ✅ AuctionExchange deployed to: ${auctionExchange.address}\n`);

  // ---- Bước 5: Deploy DisputeResolution ----
  console.log("📦 [5/5] Deploying DisputeResolution...");
  const disputeResolution = await viem.deployContract("DisputeResolution", [
    adf.address
  ]);
  console.log(`   ✅ DisputeResolution deployed to: ${disputeResolution.address}\n`);

  // ---- Thiết lập các liên kết chéo (Cross-linking) ----
  console.log("⚙️ Setting up contract cross-linkings...");
  // 1. AuctionExchange.setDisputeContract(DisputeResolution)
  await sendTx(
    auctionExchange.write.setDisputeContract([disputeResolution.address], { account: deployer.account }),
    "AuctionExchange.setDisputeContract"
  );
  // 2. ADF_Pool.setDisputeContract(DisputeResolution)
  await sendTx(
    adfPool.write.setDisputeContract([disputeResolution.address], { account: deployer.account }),
    "ADF_Pool.setDisputeContract"
  );
  // 3. DisputeResolution.setAuctionExchange(AuctionExchange)
  await sendTx(
    disputeResolution.write.setAuctionExchange([auctionExchange.address], { account: deployer.account }),
    "DisputeResolution.setAuctionExchange"
  );
  // 4. DisputeResolution.setAdfPool(ADF_Pool)
  await sendTx(
    disputeResolution.write.setAdfPool([adfPool.address], { account: deployer.account }),
    "DisputeResolution.setAdfPool"
  );
  // 5. DisputeResolution.setServerOracle(deployer)
  await sendTx(
    disputeResolution.write.setServerOracle([deployer.account.address], { account: deployer.account }),
    "DisputeResolution.setServerOracle"
  );
  // 6. DisputeResolution.setDurations(evidence, commit, reveal) -> 180 giây (3 phút) mỗi pha phục vụ demo thoải mái
  await sendTx(
    disputeResolution.write.setDurations([180n, 180n, 180n], { account: deployer.account }),
    "DisputeResolution.setDurations"
  );
  console.log("   ✅ Cross-linkings completed successfully!\n");

  // ---- Bước 6: Seed 3 Trọng Tài (Jurors) — Accounts #16-#18 (index 15-17) ----
  console.log("⚖️ [6/6] Seeding 3 Jurors (Accounts #16-#18)...");
  const jurorAddresses: string[] = [];

  if (isLocal) {
    const allWallets = await viem.getWalletClients();
    const jurorWallets = allWallets.slice(15, 18); // index 15, 16, 17
    const stakeAmount = 500n * 10n ** BigInt(decimals); // 500 ADF

    for (let i = 0; i < jurorWallets.length; i++) {
      const juror = jurorWallets[i]!;
      const jurorAddr = juror.account.address;
      jurorAddresses.push(jurorAddr);

      // 1. Juror gọi faucet 5 lần để nhận 500 ADF (100 ADF/lần)
      for (let f = 0; f < 5; f++) {
        await adf.write.faucet({ account: juror.account });
      }

      // 2. Juror approve DisputeResolution contract
      await adf.write.approve([disputeResolution.address, stakeAmount], { account: juror.account });

      // 3. Juror stake 500 ADF
      await disputeResolution.write.stakeForJuror([stakeAmount], { account: juror.account });

      console.log(`   ✅ Juror #${i + 1} (Account #${15 + i + 1}): ${jurorAddr} — Staked 500 ADF`);
    }
    console.log(`   🎯 3 Jurors seeded successfully!\n`);
  } else {
    console.log("   ⚠️ Skipping automatic juror seeding on public testnet. You must manually stake jurors on-chain from distinct accounts.\n");
  }

  // ---- Ghi địa chỉ ra file ----
  const addresses = {
    ADF: adf.address,
    ADF_Pool: adfPool.address,
    ADF_NFT: adfNft.address,
    AuctionExchange: auctionExchange.address,
    DisputeResolution: disputeResolution.address,
    deployer: deployer.account.address,
    jurors: jurorAddresses,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  // Ghi vào thư mục abi/ trong contracts
  const abiDir = path.resolve(import.meta.dirname, "..", "abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }
  fs.writeFileSync(
    path.join(abiDir, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log(`\n📄 Địa chỉ đã được ghi vào: contracts/abi/addresses.json`);

  // ---- Tự động cập nhật các file .env ở server và site ----
  console.log("\n⚙️ Automatically updating environment variables...");

  function updateEnvFile(filePath: string, updates: Record<string, string>) {
    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️ File không tồn tại: ${filePath}`);
      return;
    }
    let content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);
    
    for (const [key, value] of Object.entries(updates)) {
      let found = false;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith(`${key}=`)) {
          lines[i] = `${key}=${value}`;
          found = true;
          break;
        }
      }
      if (!found) {
        lines.push(`${key}=${value}`);
      }
    }
    fs.writeFileSync(filePath, lines.join("\n"));
    console.log(`   ✅ Cập nhật thành công: ${filePath}`);
  }

  // Cập nhật server .env
  const serverEnvPath = path.resolve(import.meta.dirname, "..", "..", "server", ".env");
  updateEnvFile(serverEnvPath, {
    ADF_ADDRESS: adf.address,
    ADF_POOL_ADDRESS: adfPool.address,
    ADF_NFT_ADDRESS: adfNft.address,
    AUCTION_EXCHANGE_ADDRESS: auctionExchange.address,
    DISPUTE_RESOLUTION_ADDRESS: disputeResolution.address,
  });

  // Cập nhật site .env
  const siteEnvPath = path.resolve(import.meta.dirname, "..", "..", "site", ".env");
  updateEnvFile(siteEnvPath, {
    VITE_ADF_ADDRESS: adf.address,
    VITE_ADF_POOL_ADDRESS: adfPool.address,
    VITE_ADF_NFT_ADDRESS: adfNft.address,
    VITE_AUCTION_EXCHANGE_ADDRESS: auctionExchange.address,
    VITE_DISPUTE_RESOLUTION_ADDRESS: disputeResolution.address,
  });

  console.log("\n=========================================");
  console.log("🎉 TRIỂN KHAI VÀ ĐỒNG BỘ MÔI TRƯỜNG THÀNH CÔNG!");
  console.log("=========================================");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\n👉 Tiếp theo: chạy 'npx hardhat run scripts/export-abi.ts' để xuất ABI");
}

main().catch((error) => {
  console.error("❌ Deploy thất bại:", error);
  process.exit(1);
});
