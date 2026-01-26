const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const logFile = "deployment-log.txt";
    let log = "";

    function writeLog(message) {
        console.log(message);
        log += message + "\n";
        fs.writeFileSync(logFile, log);
    }

    try {
        const [deployer] = await hre.ethers.getSigners();

        writeLog("🚀 Starting Deployment on Monad Testnet...");
        writeLog("Deploying contracts with account: " + deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        writeLog("Account balance: " + hre.ethers.formatEther(balance) + " MON");

        // 1. Deploy EduTrustCredential
        writeLog("\n1. Deploying EduTrustCredential...");
        const EduTrustCredential = await hre.ethers.getContractFactory("EduTrustCredential");
        const baseURI = "https://ipfs.io/ipfs/";

        const credential = await EduTrustCredential.deploy(baseURI);
        writeLog("Waiting for EduTrustCredential deployment...");
        await credential.waitForDeployment();

        const credentialAddress = await credential.getAddress();
        writeLog("✅ EduTrustCredential deployed to: " + credentialAddress);

        // 2. Deploy X402PaymentVerifier
        writeLog("\n2. Deploying X402PaymentVerifier...");
        const X402PaymentVerifier = await hre.ethers.getContractFactory("X402PaymentVerifier");
        const verificationFee = hre.ethers.parseEther("0.1"); // 0.1 MON

        const verifier = await X402PaymentVerifier.deploy(
            credentialAddress,
            verificationFee,
            deployer.address // Fee recipient
        );

        writeLog("Waiting for X402PaymentVerifier deployment...");
        await verifier.waitForDeployment();

        const verifierAddress = await verifier.getAddress();
        writeLog("✅ X402PaymentVerifier deployed to: " + verifierAddress);

        // --- Deployment Summary ---
        writeLog("\n========================================");
        writeLog("📜 DEPLOYMENT SUMMARY");
        writeLog("========================================");
        writeLog("Network: Monad Testnet (Chain ID: 10143)");
        writeLog("EduTrustCredential: " + credentialAddress);
        writeLog("X402PaymentVerifier: " + verifierAddress);
        writeLog("========================================");

        // Output JSON for frontend
        const deploymentInfo = {
            network: "Monad Testnet",
            chainId: 10143,
            deployer: deployer.address,
            timestamp: new Date().toISOString(),
            contracts: {
                EduTrustCredential: credentialAddress,
                X402PaymentVerifier: verifierAddress
            }
        };

        writeLog("\nFRONTEND CONSTANTS (Copy these):");
        writeLog(JSON.stringify(deploymentInfo, null, 2));

        // Save to file
        fs.writeFileSync(
            'deployment-addresses.json',
            JSON.stringify(deploymentInfo, null, 2)
        );
        writeLog("\n✅ Addresses saved to deployment-addresses.json");

    } catch (error) {
        writeLog("❌ Deployment failed: " + error.message);
        writeLog("Stack: " + error.stack);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
