# Hardhat Configuration for EduTrust
# These files are meant to be used in a separate Node.js environment
# Not executed in the browser - for reference and deployment

This folder contains:
- hardhat.config.ts - Hardhat configuration for Monad Testnet
- contracts/ - Solidity smart contracts
- scripts/ - Deployment and verification scripts
- test/ - Contract tests

## Setup

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox ethers@^5.7.0
```

## Environment Variables

Create a `.env` file:
```
PRIVATE_KEY=your_private_key_here
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
```

## Deploy to Monad Testnet

```bash
npx hardhat run scripts/deploy.ts --network monad
```

## Verify Contract

```bash
npx hardhat run scripts/verify.ts --network monad
```
