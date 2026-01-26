"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hardhat_1 = require("hardhat");
async function main() {
    const [deployer] = await hardhat_1.ethers.getSigners();
    console.log("🚀 Starting Deployment on Monad Testnet...");
    console.log("Deploying contracts with account:", deployer.address);
    // Ethers v6 uses .provider directly on the signer
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("Account balance:", hardhat_1.ethers.formatEther(balance), "MON");
    // 1. Deploy EduTrustCredential
    console.log("\n1. Deploying EduTrustCredential...");
    const EduTrustCredential = await hardhat_1.ethers.getContractFactory("EduTrustCredential");
    const baseURI = "https://ipfs.io/ipfs/";
    // Adding overrides for gas limit is sometimes safer on testnets
    const credential = await EduTrustCredential.deploy(baseURI);
    console.log("Waiting for EduTrustCredential deployment...");
    await credential.waitForDeployment();
    const credentialAddress = await credential.getAddress();
    console.log("✅ EduTrustCredential deployed to:", credentialAddress);
    // 2. Deploy X402PaymentVerifier
    console.log("\n2. Deploying X402PaymentVerifier...");
    const X402PaymentVerifier = await hardhat_1.ethers.getContractFactory("X402PaymentVerifier");
    const verificationFee = hardhat_1.ethers.parseEther("0.1"); // 0.1 MON
    const verifier = await X402PaymentVerifier.deploy(credentialAddress, verificationFee, deployer.address // Fee recipient
    );
    console.log("Waiting for X402PaymentVerifier deployment...");
    await verifier.waitForDeployment();
    const verifierAddress = await verifier.getAddress();
    console.log("✅ X402PaymentVerifier deployed to:", verifierAddress);
    // --- Deployment Summary ---
    console.log("\n========================================");
    console.log("📜 DEPLOYMENT SUMMARY");
    console.log("========================================");
    console.log("Network: Monad Testnet (Chain ID: 10143)");
    console.log("EduTrustCredential:", credentialAddress);
    console.log("X402PaymentVerifier:", verifierAddress);
    console.log("========================================");
    // Output JSON for you to copy-paste into your Frontend constants.ts
    const deploymentInfo = {
        EduTrustCredential: credentialAddress,
        X402PaymentVerifier: verifierAddress,
    };
    console.log("\nFRONTEND CONSTANTS (Copy these):");
    console.log(JSON.stringify(deploymentInfo, null, 2));
}
main()
    .then(() => process.exit(0))
    .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
});
