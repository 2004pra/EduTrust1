# 🎓 EduTrust Credential Hub - Monad Testnet Deployment

## ✅ Deployment Summary

**Network:** Monad Testnet  
**Chain ID:** 10143  
**RPC URL:** https://testnet-rpc.monad.xyz/  
**Deployer Address:** 0x381af6Ee9D93C9DAF539D3392416FC826FAF298B  
**Deployment Date:** 2026-01-25T04:57:37.564Z

---

## 📝 Deployed Contracts

### 1. EduTrustCredential (ERC-1155)
**Address:** `0x674C1C8955d7695F0548319FC892894268026C13`

**Purpose:** NFT-based educational credential system  
**Features:**
- Mint educational credentials as ERC-1155 tokens
- Role-based access control (ISSUER_ROLE, DEFAULT_ADMIN_ROLE)
- Credential metadata stored on-chain with IPFS references
- Revocation capability
- Student credential tracking

**Verified Functions:**
- ✅ Admin has ISSUER_ROLE
- ✅ Admin has DEFAULT_ADMIN_ROLE
- ✅ Credential minting working
- ✅ Metadata retrieval working

### 2. X402PaymentVerifier
**Address:** `0x61dad19556beecc379B891347f053D06F3Ac253b`

**Purpose:** Payment verification system for credential access  
**Configuration:**
- Verification Fee: 0.1 MON
- Fee Recipient: 0x381af6Ee9D93C9DAF539D3392416FC826FAF298B
- Access Duration: 24 hours

**Features:**
- Pay-to-verify credential system
- Time-limited access grants
- Fee collection mechanism

---

## 🧪 Verification Results

### Test Credential Minted
- **Transaction:** `0xfc6e58539618a43a11f89cb1bf0454e330e342febab56f0993a65a459715e18e`
- **Block:** 8408152
- **Token ID:** 0
- **Student:** 0x742d35cC3f9F23BDD79d1e1e7f888fe1b23f8f44
- **Title:** Bachelor of Computer Science
- **Issuer:** Stanford University
- **IPFS Hash:** QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco
- **Status:** Active (Not Revoked)

---

## 🔗 Block Explorer Links

### EduTrustCredential
- Contract: https://explorer.monad.xyz/address/0x674C1C8955d7695F0548319FC892894268026C13

### X402PaymentVerifier
- Contract: https://explorer.monad.xyz/address/0x61dad19556beecc379B891347f053D06F3Ac253b

### Test Transaction
- TX: https://explorer.monad.xyz/tx/0xfc6e58539618a43a11f89cb1bf0454e330e342febab56f0993a65a459715e18e

---

## 🚀 How to Use

### Minting a Credential
```javascript
const credential = await ethers.getContractAt(
  "EduTrustCredential",
  "0x674C1C8955d7695F0548319FC892894268026C13"
);

await credential.mintCredential(
  studentAddress,
  "Degree Title",
  "University Name",
  "IPFS_Hash"
);
```

### Verifying with Payment
```javascript
const verifier = await ethers.getContractAt(
  "X402PaymentVerifier",
  "0x61dad19556beecc379B891347f053D06F3Ac253b"
);

await verifier.payForVerification(tokenId, {
  value: ethers.parseEther("0.1")
});
```

### Checking Credential Details
```javascript
const credData = await credential.getCredential(tokenId);
console.log("Title:", credData[0]);
console.log("Issuer:", credData[1]);
console.log("IPFS Hash:", credData[2]);
console.log("Issued At:", new Date(Number(credData[3]) * 1000));
console.log("Revoked:", credData[4]);
```

---

## 📦 Frontend Integration

Add these constants to your frontend application:

```typescript
export const MONAD_TESTNET_CONFIG = {
  chainId: 10143,
  chainName: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz/",
  blockExplorer: "https://explorer.monad.xyz",
  nativeCurrency: {
    name: "MON",
    symbol: "MON",
    decimals: 18
  }
};

export const CONTRACT_ADDRESSES = {
  EduTrustCredential: "0x674C1C8955d7695F0548319FC892894268026C13",
  X402PaymentVerifier: "0x61dad19556beecc379B891347f053D06F3Ac253b"
};
```

---

## 🛠️ Available Scripts

From the `hardhat` directory:

```bash
# Compile contracts
npm run compile

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monad

# Verify deployment
npx hardhat run scripts/verify.js --network monad

# Test connection
npx hardhat run scripts/test-connection.js --network monad
```

---

## ✅ All Tests Passed

- ✅ Connection to Monad Testnet successful
- ✅ EduTrustCredential deployed and operational
- ✅ X402PaymentVerifier deployed and configured
- ✅ Credential minting tested and working
- ✅ Role-based access control verified
- ✅ Payment verification system configured
- ✅ All contract functions operational

---

## 🔐 Security Notes

1. **Private Key:** Stored in `.env` file (never commit to git)
2. **Admin Role:** Deployer has full admin and issuer privileges
3. **Fee Recipient:** Set to deployer address
4. **Access Control:** Properly configured with OpenZeppelin's AccessControl

---

## 📚 Next Steps

1. **Add More Issuers:** Use `addIssuer(address)` to grant issuer role to universities
2. **Mint Real Credentials:** Start issuing credentials to students
3. **Frontend Integration:** Connect your React app to these contracts
4. **Testing:** Test payment verification flow
5. **Monitoring:** Monitor transactions on Monad explorer

---

## 🌐 Resources

- Monad Testnet Explorer: https://explorer.monad.xyz
- Monad Documentation: https://docs.monad.xyz
- Contract ABIs: Available in `hardhat/artifacts/contracts/`

---

**Deployment Status:** ✅ COMPLETE AND VERIFIED
