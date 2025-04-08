import "@nomicfoundation/hardhat-toolbox";
// Remove this line since hardhat-toolbox already includes etherscan verification
// import "@nomiclabs/hardhat-etherscan";
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const SEPOLIA_RPC_URL = process.env.QUICK_NODE_SEPOLIA || "";
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: false,
        runs: 200,
      },
    },
  },
  networks: {
    sepolia: {
      url: SEPOLIA_RPC_URL,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
    },
    mainnet: {
      url: MAINNET_RPC_URL,
      accounts: PRIVATE_KEY !== "" ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;
