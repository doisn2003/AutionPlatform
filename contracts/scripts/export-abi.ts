/**
 * Export ABI Script — Trích xuất ABI từ artifacts và ghi ra thư mục abi/
 * 
 * Chạy: npx hardhat run scripts/export-abi.ts
 */

import fs from "node:fs";
import path from "node:path";

const CONTRACTS = ["ADF", "ADF_Pool", "ADF_NFT", "AuctionExchange", "DisputeResolution"];

async function main() {
  const artifactsDir = path.resolve(import.meta.dirname, "..", "artifacts", "contracts");
  const abiDir = path.resolve(import.meta.dirname, "..", "abi");

  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  console.log("📦 Exporting ABIs...\n");

  for (const contractName of CONTRACTS) {
    const artifactPath = path.join(
      artifactsDir,
      `${contractName}.sol`,
      `${contractName}.json`
    );

    if (!fs.existsSync(artifactPath)) {
      console.error(`❌ Artifact not found: ${artifactPath}`);
      console.error(`   Hãy chạy 'npx hardhat compile' trước.`);
      continue;
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
    const abi = artifact.abi;

    const outputPath = path.join(abiDir, `${contractName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(abi, null, 2));
    console.log(`   ✅ ${contractName}.json (${abi.length} entries)`);
  }

  console.log(`\n🎉 ABIs exported to: contracts/abi/`);
}

main().catch((error) => {
  console.error("❌ Export ABI thất bại:", error);
  process.exit(1);
});
