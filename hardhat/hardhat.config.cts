import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

// This is the safer way to call it in .cts
dotenv.config(); 

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris" 
    },
  },
  networks: {
    monad: {
      url: "https://testnet-rpc.monad.xyz/",
      // Use process.env.PRIVATE_KEY directly here
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143,
    },
  },
};

export default config;