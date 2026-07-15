/**
 * Wagmi v3 Configuration — Kết nối ví Metamask với blockchain
 */

import { http, createConfig } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// Custom chain nếu cần (Amoy testnet)
// Hiện tại dùng Hardhat local hoặc Sepolia
const rpcUrl = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia],
  connectors: [
    injected(), // MetaMask, Coinbase Wallet, etc.
  ],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http(rpcUrl),
  },
});
