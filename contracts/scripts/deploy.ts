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
  console.log("📦 [1/3] Deploying ADF Token (ERC20)...");
  const adf = await viem.deployContract("ADF");
  console.log(`   ✅ ADF deployed to: ${adf.address}\n`);

  // ---- Bước 2: Deploy ADF_NFT (ERC721) ----
  console.log("📦 [2/3] Deploying ADF_NFT (ERC721)...");
  const adfNft = await viem.deployContract("ADF_NFT", [deployer.account.address]);
  console.log(`   ✅ ADF_NFT deployed to: ${adfNft.address}\n`);

  // ---- Bước 3: Deploy AuctionExchange ----
  console.log("📦 [3/3] Deploying AuctionExchange...");
  const auctionExchange = await viem.deployContract("AuctionExchange", [
    adf.address,
    adfNft.address,
  ]);
  console.log(`   ✅ AuctionExchange deployed to: ${auctionExchange.address}\n`);

  // ---- Ghi địa chỉ ra file ----
  const addresses = {
    ADF: adf.address,
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

  console.log("=========================================");
  console.log("🎉 TRIỂN KHAI THÀNH CÔNG!");
  console.log("=========================================");
  console.log(JSON.stringify(addresses, null, 2));
  console.log(`\n📄 Địa chỉ đã được ghi vào: contracts/abi/addresses.json`);
  console.log("👉 Tiếp theo: chạy 'npx hardhat run scripts/export-abi.ts' để xuất ABI");
}

main().catch((error) => {
  console.error("❌ Deploy thất bại:", error);
  process.exit(1);
});
