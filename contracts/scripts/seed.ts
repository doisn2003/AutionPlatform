// @ts-nocheck
/**
 * Seed Script — Tạo kịch bản test với nhiều phiên đấu giá
 * 
 * Kịch bản:
 * 1. Phiên "Ngay bây giờ" — Bắt đầu ngay, kéo dài 5 phút (dùng để test bidding)
 * 2. Phiên "Đang hoạt động" — Bắt đầu ngay, kéo dài 2 giờ  
 * 3. Phiên "Đang hoạt động (có bid)" — Đã có 2 người bid
 * 4. Phiên "Sắp hết" — Bắt đầu ngay, kéo dài 10 phút
 * 5. Phiên "Chưa có bid" — Bắt đầu ngay, kéo dài 1 giờ
 * 
 * Chạy: npx hardhat run scripts/seed.ts --network localhost
 */

import hre from "hardhat";

async function main() {
  const { viem } = await hre.network.connect();
  const [deployer, seller1, seller2, buyer1, buyer2] = await viem.getWalletClients();
  const publicClient = await viem.getPublicClient();

  console.log("=========================================");
  console.log("🌱 BẮT ĐẦU SEED DATA");
  console.log("=========================================\n");

  // ---- Deploy contracts ----
  console.log("📦 Deploying contracts...");
  const adf = await viem.deployContract("ADF");
  const adfNft = await viem.deployContract("ADF_NFT", [deployer.account.address]);
  const exchange = await viem.deployContract("AuctionExchange", [adf.address, adfNft.address]);

  console.log(`   ADF:              ${adf.address}`);
  console.log(`   ADF_NFT:          ${adfNft.address}`);
  console.log(`   AuctionExchange:  ${exchange.address}\n`);

  // ---- Lưu địa chỉ ra file ----
  const fs = await import("node:fs");
  const path = await import("node:path");
  const abiDir = path.resolve(import.meta.dirname, "..", "abi");
  if (!fs.existsSync(abiDir)) fs.mkdirSync(abiDir, { recursive: true });
  fs.writeFileSync(
    path.join(abiDir, "addresses.json"),
    JSON.stringify({
      ADF: adf.address,
      ADF_NFT: adfNft.address,
      AuctionExchange: exchange.address,
      deployer: deployer.account.address,
      network: hre.network.name,
      deployedAt: new Date().toISOString(),
    }, null, 2)
  );

  const decimals = await adf.read.decimals();
  const unit = 10n ** BigInt(decimals); // 1 ADF = 10^18

  // ---- Faucet cho tất cả ----
  console.log("💰 Faucet ADF cho các tài khoản...");
  for (const account of [seller1, seller2, buyer1, buyer2]) {
    // Gọi faucet nhiều lần để có đủ tiền test
    for (let i = 0; i < 10; i++) {
      await adf.write.faucet({ account: account.account });
    }
    const balance = await adf.read.balanceOf([account.account.address]);
    console.log(`   ${account.account.address}: ${Number(balance / unit)} ADF`);
  }

  // ---- Approve ADF cho sàn (unlimited) ----
  console.log("\n🔓 Approve ADF cho sàn (unlimited)...");
  const maxApproval = 1000000n * unit;
  for (const account of [buyer1, buyer2]) {
    await adf.write.approve([exchange.address, maxApproval], { account: account.account });
  }

  // ---- Mint NFTs ----
  console.log("\n🎨 Mint NFTs...");
  const nftURIs = [
    "https://images.unsplash.com/photo-1644024276223-4411136b672e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1617791160505-6f006e121980?w=500&auto=format&fit=crop&q=80",
  ];

  // Mint 5 NFTs (3 cho seller1, 2 cho seller2)
  for (let i = 0; i < 3; i++) {
    await adfNft.write.mintNFT([nftURIs[i]!], { account: seller1.account });
    console.log(`   NFT #${i + 1} minted for seller1`);
  }
  for (let i = 3; i < 5; i++) {
    await adfNft.write.mintNFT([nftURIs[i]!], { account: seller2.account });
    console.log(`   NFT #${i + 1} minted for seller2`);
  }

  // ---- Approve NFTs cho sàn ----
  console.log("\n🔓 Approve NFTs cho sàn...");
  for (let i = 1; i <= 3; i++) {
    await adfNft.write.approve([exchange.address, BigInt(i)], { account: seller1.account });
  }
  for (let i = 4; i <= 5; i++) {
    await adfNft.write.approve([exchange.address, BigInt(i)], { account: seller2.account });
  }

  // ---- Tạo các phiên đấu giá ----
  console.log("\n🏷️ Tạo các phiên đấu giá...\n");

  // Phiên 1: "Quick Test" — 5 PHÚT để test bidding
  const duration1 = 300n; // 5 phút = 300 giây
  const reserve1 = 1n * unit; // 1 ADF
  const increment1 = unit / 10n; // 0.1 ADF
  await exchange.write.createAuction([1n, duration1, reserve1, increment1], { account: seller1.account });
  console.log("   ✅ Phiên #1: 'Quick Test' — 5 phút, giá khởi điểm 1 ADF, bước nhảy 0.1 ADF");

  // Phiên 2: "Bộ Sưu Tập Vũ Trụ" — 2 giờ
  const duration2 = 7200n; // 2 giờ
  const reserve2 = 5n * unit; // 5 ADF
  const increment2 = unit / 2n; // 0.5 ADF
  await exchange.write.createAuction([2n, duration2, reserve2, increment2], { account: seller1.account });
  console.log("   ✅ Phiên #2: 'Bộ Sưu Tập Vũ Trụ' — 2 giờ, giá khởi điểm 5 ADF, bước nhảy 0.5 ADF");

  // Phiên 3: "Nghệ Thuật Số" — 1 giờ, ĐÃ CÓ 2 LƯỢT BID
  const duration3 = 3600n; // 1 giờ
  const reserve3 = 2n * unit; // 2 ADF
  const increment3 = unit / 5n; // 0.2 ADF  
  await exchange.write.createAuction([3n, duration3, reserve3, increment3], { account: seller1.account });
  // Buyer1 bid 2 ADF
  await exchange.write.bid([3n, reserve3], { account: buyer1.account });
  // Buyer2 bid 2.5 ADF
  await exchange.write.bid([3n, reserve3 + increment3 + increment3 + increment3], { account: buyer2.account });
  console.log("   ✅ Phiên #3: 'Nghệ Thuật Số' — 1 giờ, đã có 2 bid (buyer2 đang dẫn 2.6 ADF)");

  // Phiên 4: "Mật Mã Tự Nhiên" — 10 phút
  const duration4 = 600n; // 10 phút
  const reserve4 = 3n * unit; // 3 ADF
  const increment4 = unit; // 1 ADF
  await exchange.write.createAuction([4n, duration4, reserve4, increment4], { account: seller2.account });
  console.log("   ✅ Phiên #4: 'Mật Mã Tự Nhiên' — 10 phút, giá khởi điểm 3 ADF, bước nhảy 1 ADF");

  // Phiên 5: "Sự Tĩnh Lặng" — 1 giờ, không có bid
  const duration5 = 3600n; // 1 giờ
  const reserve5 = 10n * unit; // 10 ADF  
  const increment5 = 2n * unit; // 2 ADF
  await exchange.write.createAuction([5n, duration5, reserve5, increment5], { account: seller2.account });
  console.log("   ✅ Phiên #5: 'Sự Tĩnh Lặng' — 1 giờ, giá khởi điểm 10 ADF, bước nhảy 2 ADF");

  // ---- Tổng kết ----
  console.log("\n=========================================");
  console.log("🎉 SEED HOÀN TẤT!");
  console.log("=========================================");
  console.log("\n📋 Tổng kết:");
  console.log(`   Contracts:  3 (ADF, ADF_NFT, AuctionExchange)`);
  console.log(`   NFTs:       5 (3 seller1, 2 seller2)`);
  console.log(`   Auctions:   5 (1 quick-test 5m, 1 x 2h, 1 x 1h có bid, 1 x 10m, 1 x 1h no-bid)`);
  console.log(`   Bids:       2 (trên phiên #3)`);
  console.log("\n📍 Accounts:");
  console.log(`   Deployer: ${deployer.account.address}`);
  console.log(`   Seller 1: ${seller1.account.address}`);
  console.log(`   Seller 2: ${seller2.account.address}`);
  console.log(`   Buyer 1:  ${buyer1.account.address}`);
  console.log(`   Buyer 2:  ${buyer2.account.address}`);
  console.log(`\n⏱️  Phiên #1 (Quick Test) kết thúc sau 5 phút — hãy nhanh chóng test bidding!`);
  console.log(`📄 Địa chỉ đã ghi vào: contracts/abi/addresses.json`);
}

main().catch((error) => {
  console.error("❌ Seed thất bại:", error);
  process.exit(1);
});
