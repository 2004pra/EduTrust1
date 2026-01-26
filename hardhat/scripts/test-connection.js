const hre = require("hardhat");
const fs = require("fs");

async function main() {
    const logFile = "test-output.txt";
    let log = "";

    function writeLog(message) {
        console.log(message);
        log += message + "\n";
    }

    try {
        writeLog("Testing Monad Testnet Connection...");
        writeLog("RPC URL: " + hre.network.config.url);
        writeLog("Chain ID: " + hre.network.config.chainId);

        const [deployer] = await hre.ethers.getSigners();
        writeLog("Deployer address: " + deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        writeLog("Balance: " + hre.ethers.formatEther(balance) + " MON");

        const network = await hre.ethers.provider.getNetwork();
        writeLog("Connected to network: " + network.name + " Chain ID: " + network.chainId);

        const blockNumber = await hre.ethers.provider.getBlockNumber();
        writeLog("Current block number: " + blockNumber);

        writeLog("\n✅ Connection successful!");

        fs.writeFileSync(logFile, log);
        writeLog("Log written to " + logFile);
    } catch (error) {
        writeLog("❌ Connection failed: " + error.message);
        writeLog("Full error: " + JSON.stringify(error, null, 2));
        fs.writeFileSync(logFile, log);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
