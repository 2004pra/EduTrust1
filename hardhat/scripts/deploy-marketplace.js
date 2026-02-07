const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying Notes Marketplace Contracts to Monad Testnet...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("📍 Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Deployer balance:", hre.ethers.formatEther(balance), "MON\n");

    // Deploy EduNotes (NFT Contract)
    console.log("📝 Deploying EduNotes...");
    const EduNotes = await hre.ethers.getContractFactory("EduNotes");
    const eduNotes = await EduNotes.deploy();
    await eduNotes.waitForDeployment();
    const eduNotesAddress = await eduNotes.getAddress();
    console.log("✅ EduNotes deployed to:", eduNotesAddress);

    // Deploy NotesMarketplace
    console.log("\n🏪 Deploying NotesMarketplace...");
    const NotesMarketplace = await hre.ethers.getContractFactory("NotesMarketplace");
    const notesMarketplace = await NotesMarketplace.deploy(
        eduNotesAddress,      // EduNotes contract address
        deployer.address      // Fee recipient (platform treasury)
    );
    await notesMarketplace.waitForDeployment();
    const marketplaceAddress = await notesMarketplace.getAddress();
    console.log("✅ NotesMarketplace deployed to:", marketplaceAddress);

    // Save deployment addresses
    const deploymentInfo = {
        network: "monad-testnet",
        chainId: 10143,
        deployedAt: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            EduNotes: eduNotesAddress,
            NotesMarketplace: marketplaceAddress
        },
        configuration: {
            minPrice: "10 MON",
            maxPrice: "100 MON",
            minWithdrawal: "50 MON",
            platformFee: "5%",
            creatorRoyalty: "5%",
            feeRecipient: deployer.address
        }
    };

    // Save to file
    const addressFile = path.join(__dirname, "..", "notes-marketplace-addresses.json");
    fs.writeFileSync(addressFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("\n📁 Addresses saved to:", addressFile);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📋 DEPLOYMENT SUMMARY");
    console.log("=".repeat(60));
    console.log("\n🎓 EduNotes (NFT):");
    console.log("   Address:", eduNotesAddress);
    console.log("   Purpose: Mint study notes as NFTs");
    console.log("   Features: ERC-721, EIP-2981 royalties (5%)");

    console.log("\n🏪 NotesMarketplace:");
    console.log("   Address:", marketplaceAddress);
    console.log("   Purpose: Buy/sell notes with fees");
    console.log("   Price Range: 10 - 100 MON");
    console.log("   Platform Fee: 5%");
    console.log("   Min Withdrawal: 50 MON");
    console.log("   Fee Recipient:", deployer.address);

    console.log("\n" + "=".repeat(60));
    console.log("✅ DEPLOYMENT COMPLETE!");
    console.log("=".repeat(60));

    // Verify on explorer
    console.log("\n🔗 View on Explorer:");
    console.log("   EduNotes: https://explorer.monad.xyz/address/" + eduNotesAddress);
    console.log("   Marketplace: https://explorer.monad.xyz/address/" + marketplaceAddress);

    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
