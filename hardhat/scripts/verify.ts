import { ethers } from "hardhat";

// Update these addresses after deployment
const CREDENTIAL_CONTRACT = "0x..."; // Replace with deployed address
const VERIFIER_CONTRACT = "0x..."; // Replace with deployed address

async function main() {
  const [admin] = await ethers.getSigners();
  console.log("Running verification with account:", admin.address);

  // Get contract instances
  const credential = await ethers.getContractAt("EduTrustCredential", CREDENTIAL_CONTRACT);
  const verifier = await ethers.getContractAt("X402PaymentVerifier", VERIFIER_CONTRACT);

  console.log("\n========================================");
  console.log("CONTRACT VERIFICATION");
  console.log("========================================");

  // Verify EduTrustCredential
  console.log("\n1. EduTrustCredential Verification:");
  const tokenIdCounter = await credential.totalSupply(0).catch(() => "N/A");
  const hasIssuerRole = await credential.hasRole(
    ethers.keccak256(ethers.toUtf8Bytes("ISSUER_ROLE")),
    admin.address
  );
  console.log("- Admin has ISSUER_ROLE:", hasIssuerRole);
  // Verify X402PaymentVerifier
  console.log("\n2. X402PaymentVerifier Verification:");
  const verificationFee = await verifier.verificationFee();
  const feeRecipient = await verifier.feeRecipient();
  const accessDuration = await verifier.accessDuration();
  console.log("- Verification Fee:", ethers.formatEther(verificationFee), "MON");
  console.log("- Fee Recipient:", feeRecipient);
  console.log("- Access Duration:", Number(accessDuration) / 3600, "hours");

  // Test mint credential
  console.log("\n3. Testing Credential Mint:");
  const testStudent = "0x742d35cc3f9f23bdd79d1e1e7f888fe1b23f8f44"; // Example address
  const tx = await credential.mintCredential(
    testStudent,
    "Bachelor of Computer Science",
    "Stanford University",
    "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
  );
  const receipt = await tx.wait();
  console.log("- Credential minted! TX:", receipt?.hash);

  // Get the minted token ID from events
  const event = receipt?.logs.find(
    (log: any) => log.fragment?.name === "CredentialMinted"
  );
  if (event) {
    console.log("- Token ID:", event.args?.tokenId.toString());
  }

  console.log("\n========================================");
  console.log("VERIFICATION COMPLETE");
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
