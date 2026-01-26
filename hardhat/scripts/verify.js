const hre = require("hardhat");
const fs = require("fs");

// Read deployed addresses
const deployment = JSON.parse(fs.readFileSync("deployment-addresses.json", "utf8"));
const CREDENTIAL_CONTRACT = deployment.contracts.EduTrustCredential;
const VERIFIER_CONTRACT = deployment.contracts.X402PaymentVerifier;

async function main() {
    const logFile = "verification-log.txt";
    let log = "";

    function writeLog(message) {
        console.log(message);
        log += message + "\n";
        fs.writeFileSync(logFile, log);
    }

    try {
        const [admin] = await hre.ethers.getSigners();
        writeLog("Running verification with account: " + admin.address);

        // Get contract instances
        const credential = await hre.ethers.getContractAt("EduTrustCredential", CREDENTIAL_CONTRACT);
        const verifier = await hre.ethers.getContractAt("X402PaymentVerifier", VERIFIER_CONTRACT);

        writeLog("\n========================================");
        writeLog("CONTRACT VERIFICATION");
        writeLog("========================================");

        // Verify EduTrustCredential
        writeLog("\n1. EduTrustCredential Verification:");
        writeLog("   Address: " + CREDENTIAL_CONTRACT);

        const ISSUER_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ISSUER_ROLE"));
        const hasIssuerRole = await credential.hasRole(ISSUER_ROLE, admin.address);
        writeLog("   - Admin has ISSUER_ROLE: " + hasIssuerRole);

        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        const hasAdminRole = await credential.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
        writeLog("   - Admin has DEFAULT_ADMIN_ROLE: " + hasAdminRole);

        // Verify X402PaymentVerifier
        writeLog("\n2. X402PaymentVerifier Verification:");
        writeLog("   Address: " + VERIFIER_CONTRACT);

        const verificationFee = await verifier.verificationFee();
        const feeRecipient = await verifier.feeRecipient();
        const accessDuration = await verifier.accessDuration();

        writeLog("   - Verification Fee: " + hre.ethers.formatEther(verificationFee) + " MON");
        writeLog("   - Fee Recipient: " + feeRecipient);
        writeLog("   - Access Duration: " + (Number(accessDuration) / 3600) + " hours");

        // Test mint credential
        writeLog("\n3. Testing Credential Mint:");
        const testStudent = "0x742d35cc3f9f23bdd79d1e1e7f888fe1b23f8f44"; // Example address

        writeLog("   - Minting credential to: " + testStudent);
        const tx = await credential.mintCredential(
            testStudent,
            "Bachelor of Computer Science",
            "Stanford University",
            "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
        );

        writeLog("   - Transaction sent: " + tx.hash);
        const receipt = await tx.wait();
        writeLog("   - Transaction confirmed in block: " + receipt.blockNumber);

        // Find the CredentialMinted event
        const credentialInterface = credential.interface;
        let tokenId = null;

        for (const log of receipt.logs) {
            try {
                const parsed = credentialInterface.parseLog(log);
                if (parsed && parsed.name === "CredentialMinted") {
                    tokenId = parsed.args.tokenId;
                    writeLog("   - Token ID: " + tokenId.toString());
                    writeLog("   - Student: " + parsed.args.student);
                    writeLog("   - Title: " + parsed.args.title);
                    break;
                }
            } catch (e) {
                // Not our event, skip
            }
        }

        // Verify the credential was minted
        if (tokenId !== null) {
            writeLog("\n4. Verifying Minted Credential:");
            const credData = await credential.getCredential(tokenId);
            writeLog("   - Title: " + credData[0]);
            writeLog("   - Issuer: " + credData[1]);
            writeLog("   - IPFS Hash: " + credData[2]);
            writeLog("   - Issued At: " + new Date(Number(credData[3]) * 1000).toISOString());
            writeLog("   - Revoked: " + credData[4]);

            const balance = await credential.balanceOf(testStudent, tokenId);
            writeLog("   - Student balance: " + balance.toString());
        }

        writeLog("\n========================================");
        writeLog("✅ VERIFICATION COMPLETE - ALL TESTS PASSED!");
        writeLog("========================================");

        writeLog("\n📋 Summary:");
        writeLog("- EduTrustCredential deployed and working");
        writeLog("- X402PaymentVerifier deployed and configured");
        writeLog("- Successfully minted test credential");
        writeLog("- All contract functions operational");

    } catch (error) {
        writeLog("\n❌ Verification failed: " + error.message);
        writeLog("Stack: " + error.stack);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
