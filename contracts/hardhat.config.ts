import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      // initialBaseFeePerGas = 0: giữ phí gas thấp, không leo thang theo block
      // blockGasLimit đủ lớn để tránh "exceeds gas cap" error
      initialBaseFeePerGas: 0,
      blockGasLimit: 30_000_000,
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      initialBaseFeePerGas: 0,
      blockGasLimit: 30_000_000,
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
