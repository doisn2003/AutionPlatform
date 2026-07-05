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
  const ethAmount = 10n * 10n ** 18n; // 10 ETH
  
  // Approve ADF
  await adf.write.approve([adfPool.address, adfAmount], { account: deployer.account });
  // Add Liquidity
  await adfPool.write.addLiquidity([adfAmount], { account: deployer.account, value: ethAmount });
  console.log("   ✅ Initial liquidity added: 10 ETH + 1,000,000 ADF\n");

  // ---- Bước 3: Deploy ADF_NFT (ERC721) ----
  console.log("📦 [3/4] Deploying ADF_NFT (ERC721)...");
  const adfNft = await viem.deployContract("ADF_NFT", [deployer.account.address]);
  console.log(`   ✅ ADF_NFT deployed to: ${adfNft.address}\n`);

  // ---- Bước 4: Deploy AuctionExchange ----
  console.log("📦 [4/4] Deploying AuctionExchange...");
  const auctionExchange = await viem.deployContract("AuctionExchange", [
    adf.address,
    adfNft.address,
  ]);
  console.log(`   ✅ AuctionExchange deployed to: ${auctionExchange.address}\n`);

  // ---- Ghi địa chỉ ra file ----
  const addresses = {
    ADF: adf.address,
    ADF_Pool: adfPool.address,
    ADF_NFT: adfNft.address,
    AuctionExchange: auctionExchange.address,
    deployer: deployer.account.address,
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
  });

  // Cập nhật site .env
  const siteEnvPath = path.resolve(import.meta.dirname, "..", "..", "site", ".env");
  updateEnvFile(siteEnvPath, {
    VITE_ADF_ADDRESS: adf.address,
    VITE_ADF_POOL_ADDRESS: adfPool.address,
    VITE_ADF_NFT_ADDRESS: adfNft.address,
    VITE_AUCTION_EXCHANGE_ADDRESS: auctionExchange.address,
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
