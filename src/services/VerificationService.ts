import { ethers, BrowserProvider, Contract, formatEther } from 'ethers';

// Contract ABIs (minimal for frontend usage)
export const CREDENTIAL_ABI = [
  "function getCredential(uint256 tokenId) view returns (string title, string issuer, address issuerAddress, string ipfsHash, uint256 issuedAt, bool revoked)",
  "function balanceOf(address account, uint256 id) view returns (uint256 balance)",
  "function getStudentCredentials(address student) view returns (uint256[] tokenIds)",
  "function uri(uint256 tokenId) view returns (string uri)",
  "function mintCredential(address student, string memory title, string memory issuer, string memory ipfsHash) returns (uint256 tokenId)",
  "event CredentialMinted(uint256 indexed tokenId, address indexed student, address indexed issuer, string title, string ipfsHash)",
];

export const VERIFIER_ABI = [
  "function verificationFee() view returns (uint256 fee)",
  "function hasAccess(address verifier, uint256 tokenId) view returns (bool hasAccess)",
  "function getAccessExpiry(address verifier, uint256 tokenId) view returns (uint256 expiresAt)",
  "function requestVerification(uint256 tokenId, address studentAddress) payable returns (bytes32 requestId)",
  "function verificationCount(uint256 tokenId) view returns (uint256 count)",
  "function studentEarnings(address student) view returns (uint256 earnings)",
  "function withdrawEarnings()",
  "event VerificationPaymentReceived(uint256 indexed tokenId, address indexed verifier, address indexed student, uint256 amount, bytes32 accessHash)",
  "event AccessGranted(uint256 indexed tokenId, address indexed verifier, uint256 expiresAt)",
];

// Contract addresses - Update after deployment
// Contract addresses - Updated from DEPLOYMENT.md
export const CONTRACT_ADDRESSES = {
  monadTestnet: {
    credential: "0xf00DAc39d6cd1311f5D0EA121Afa61181E126740",
    verifier: "0xf80f7Ec1a771e9390e13341AD56022EFb7DF4AD2",
  },
};

export const MONAD_TESTNET = {
  chainId: 10143,
  chainIdHex: '0x279F',
  name: 'Monad Testnet',
  rpcUrl: 'https://testnet-rpc.monad.xyz',
  blockExplorer: 'https://testnet.monadexplorer.com',
  currency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
};

export interface CredentialData {
  tokenId: number;
  title: string;
  issuer: string;
  ipfsHash: string;
  issuedAt: Date;
  revoked: boolean;
  owner: string;
}

export interface VerificationResult {
  success: boolean;
  accessHash?: string;
  expiresAt?: Date;
  transactionHash?: string;
  error?: string;
}

export interface MintResult {
  success: boolean;
  tokenId?: string;
  transactionHash?: string;
  error?: string;
}

export class VerificationService {
  private provider: BrowserProvider | null = null;
  private credentialContract: Contract | null = null;
  private verifierContract: Contract | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initProvider();
  }

  /**
   * Ensure provider and contracts are initialized
   * Call this before any blockchain operation
   */
  async ensureInitialized(): Promise<boolean> {
    if (this.initialized && this.credentialContract) {
      return true;
    }

    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        this.provider = new BrowserProvider(window.ethereum);
        this.initContracts();
        this.initialized = true;
        return true;
      } catch (err) {
        console.error('Failed to initialize provider:', err);
        return false;
      }
    }
    return false;
  }

  private async initProvider() {
    if (typeof window !== 'undefined') {
      // Small delay to ensure extension is injected
      await new Promise(resolve => setTimeout(resolve, 300));

      if (window.ethereum) {
        try {
          this.provider = new BrowserProvider(window.ethereum);
          this.initContracts();
          this.initialized = true;
        } catch (err) {
          console.error('Failed to initialize provider:', err);
        }
      }
    }
  }

  private initContracts() {
    if (!this.provider) return;

    const addresses = CONTRACT_ADDRESSES.monadTestnet;

    this.credentialContract = new Contract(
      addresses.credential,
      CREDENTIAL_ABI,
      this.provider
    );

    this.verifierContract = new Contract(
      addresses.verifier,
      VERIFIER_ABI,
      this.provider
    );
  }

  /**
   * Get credential data by token ID
   */
  async getCredential(tokenId: number): Promise<CredentialData | null> {
    if (!this.credentialContract) {
      console.error('Credential contract not initialized');
      return null;
    }

    try {
      const [title, issuer, , ipfsHash, issuedAt, revoked] =
        await this.credentialContract.getCredential(tokenId);

      return {
        tokenId,
        title,
        issuer,
        ipfsHash,
        issuedAt: new Date(Number(issuedAt) * 1000),
        revoked,
        owner: '', // Would need to query balanceOf for all known addresses
      };
    } catch (error) {
      console.error('Failed to get credential:', error);
      return null;
    }
  }

  /**
   * Get verification fee in MON
   */
  async getVerificationFee(): Promise<string> {
    if (!this.verifierContract) {
      return '0.1'; // Default fallback
    }

    try {
      const fee = await this.verifierContract.verificationFee();
      return formatEther(fee);
    } catch (error) {
      console.error('Failed to get verification fee:', error);
      return '0.1';
    }
  }

  /**
   * Check if user has active access to a credential
   */
  async checkAccess(verifierAddress: string, tokenId: number): Promise<boolean> {
    await this.ensureInitialized();
    if (!this.verifierContract) return false;

    try {
      return await this.verifierContract.hasAccess(verifierAddress, tokenId);
    } catch (error) {
      console.error('Failed to check access:', error);
      return false;
    }
  }

  /**
   * Mint a new credential
   */
  async mintCredential(
    studentAddress: string,
    title: string,
    issuer: string,
    ipfsHash: string
  ): Promise<MintResult> {
    if (!this.provider || !this.credentialContract) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const signer = await this.provider.getSigner();
      const contractWithSigner = this.credentialContract.connect(signer) as Contract;

      const tx = await contractWithSigner.mintCredential(
        studentAddress,
        title,
        issuer,
        ipfsHash
      );

      const receipt = await tx.wait();

      // Parse event to get Token ID
      let tokenId = '';
      for (const log of receipt.logs) {
        try {
          // Attempt to parse standard event log
          // In a more robust implementation, use the interface to parse log
          if (log.topics[0] === ethers.id("CredentialMinted(uint256,address,address,string,string)")) {
            tokenId = BigInt(log.topics[1]).toString();
            break;
          }
        } catch (e) {
          console.warn("Failed to parse log", e);
        }
      }

      // Fallback if manual topic parsing fails (or just return string "unknown" and let UI refresh)
      // Ideally we use interface.parseLog(log)
      if (!tokenId) {
        // Try Ethers interface parsing
        for (const log of receipt.logs) {
          try {
            const parsed = this.credentialContract.interface.parseLog(log);
            if (parsed && parsed.name === 'CredentialMinted') {
              tokenId = parsed.args.tokenId.toString();
              break;
            }
          } catch (e) {
            // Ignore
          }
        }
      }

      return {
        success: true,
        transactionHash: receipt.hash,
        tokenId: tokenId || 'unknown'
      };
    } catch (error: any) {
      console.error('Minting failed:', error);
      return {
        success: false,
        error: error.reason || error.message || 'Minting failed'
      };
    }
  }

  /**
   * Request verification with x402 payment
   */
  async requestVerification(
    tokenId: number,
    studentAddress: string
  ): Promise<VerificationResult> {
    if (!this.provider || !this.verifierContract) {
      return { success: false, error: 'Wallet not connected' };
    }

    const addresses = CONTRACT_ADDRESSES.monadTestnet;
    if (
      !addresses.verifier ||
      addresses.verifier === '0x0000000000000000000000000000000000000000'
    ) {
      return {
        success: false,
        error: 'Verifier contract address not configured. On-chain payment is disabled.',
      };
    }

    try {
      const signer = await this.provider.getSigner();
      const verifierWithSigner = this.verifierContract.connect(signer) as Contract;

      // Get verification fee
      const fee = await this.verifierContract.verificationFee();

      // Send transaction
      const tx = await verifierWithSigner.requestVerification(
        tokenId,
        studentAddress,
        { value: fee }
      ).catch((err: any) => {
        // Enhance error message if it's the specific "Student does not own" error
        if (err.data && err.data.includes('Student does not own')) {
          throw new Error('Student does not own this credential (Token ID/Address mismatch)');
        }
        throw err;
      });

      // Wait for confirmation
      const receipt = await tx.wait();

      // In v6, parsing events requires interface. For now, assuming success if no error.
      // To properly get return values, we'd need to parse logs.

      return {
        success: true,
        transactionHash: receipt.hash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Mock expiry for now
      };
    } catch (error: any) {
      console.error('Verification failed:', error);

      // Handle user rejection
      if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
        return { success: false, error: 'Transaction rejected by user' };
      }

      // Handle insufficient funds
      if (error.code === 'INSUFFICIENT_FUNDS') {
        return { success: false, error: 'Insufficient MON balance' };
      }

      const msg = error.reason || error.message || 'Verification failed';
      if (msg.includes("Student does not own")) {
        return { success: false, error: "Validation Error: On-chain check failed. Ensure you are using the correct Token ID and Student Address." };
      }

      return {
        success: false,
        error: msg
      };
    }
  }

  /**
   * Get all credentials for a student address from the blockchain
   */
  async getStudentCredentials(studentAddress: string): Promise<CredentialData[]> {
    // Ensure provider is initialized
    await this.ensureInitialized();

    if (!this.credentialContract) {
      console.error('Credential contract not initialized');
      return [];
    }

    try {
      // Get token IDs owned by this student
      const tokenIds: bigint[] = await this.credentialContract.getStudentCredentials(studentAddress);

      // Fetch details for each credential
      const credentials: CredentialData[] = [];
      for (const tokenId of tokenIds) {
        try {
          const [title, issuer, , ipfsHash, issuedAt, revoked] =
            await this.credentialContract.getCredential(Number(tokenId));

          credentials.push({
            tokenId: Number(tokenId),
            title,
            issuer,
            ipfsHash,
            issuedAt: new Date(Number(issuedAt) * 1000),
            revoked,
            owner: studentAddress,
          });
        } catch (e) {
          console.warn(`Failed to fetch credential ${tokenId}:`, e);
        }
      }

      return credentials;
    } catch (error) {
      console.error('Failed to get student credentials:', error);
      return [];
    }
  }

  /**
   * Search for a credential by IPFS hash across all known tokens
   * This queries the blockchain to find a matching credential
   */
  async findCredentialByIPFSHash(ipfsHash: string, maxTokenId: number = 100): Promise<CredentialData | null> {
    // Ensure provider is initialized
    await this.ensureInitialized();

    if (!this.credentialContract) {
      console.error('Credential contract not initialized');
      return null;
    }

    try {
      // Search through tokens to find matching IPFS hash
      for (let tokenId = 0; tokenId <= maxTokenId; tokenId++) {
        try {
          const [title, issuer, , storedHash, issuedAt, revoked] =
            await this.credentialContract.getCredential(tokenId);

          // Check if this credential's IPFS hash matches
          if (storedHash && storedHash.toLowerCase() === ipfsHash.toLowerCase()) {
            return {
              tokenId,
              title,
              issuer,
              ipfsHash: storedHash,
              issuedAt: new Date(Number(issuedAt) * 1000),
              revoked,
              owner: '', // Would need additional query
            };
          }
        } catch (e) {
          // Token doesn't exist, continue searching
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error('Failed to find credential by IPFS hash:', error);
      return null;
    }
  }

  /**
   * Get a credential directly by token ID from the blockchain
   * Enhanced version with student address lookup
   */
  async getCredentialWithOwner(tokenId: number, studentAddress?: string): Promise<CredentialData | null> {
    if (!this.credentialContract) {
      console.error('Credential contract not initialized');
      return null;
    }

    try {
      const [title, issuer, , ipfsHash, issuedAt, revoked] =
        await this.credentialContract.getCredential(tokenId);

      return {
        tokenId,
        title,
        issuer,
        ipfsHash,
        issuedAt: new Date(Number(issuedAt) * 1000),
        revoked,
        owner: studentAddress || '',
      };
    } catch (error) {
      console.error('Failed to get credential:', error);
      return null;
    }
  }

  /**
   * Check token balance of an address
   */
  async checkBalance(address: string, tokenId: number): Promise<number> {
    await this.ensureInitialized();
    if (!this.credentialContract) return 0;

    try {
      const balance = await this.credentialContract.balanceOf(address, tokenId);
      return Number(balance);
    } catch (error) {
      console.error('Failed to check balance:', error);
      return 0;
    }
  }

  /**
   * Get verification count for a credential
   */
  async getVerificationCount(tokenId: number): Promise<number> {
    if (!this.verifierContract) return 0;

    try {
      const count = await this.verifierContract.verificationCount(tokenId);
      return Number(count);
    } catch (error) {
      console.error('Failed to get verification count:', error);
      return 0;
    }
  }

  /**
   * Get student earnings
   */
  async getStudentEarnings(studentAddress: string): Promise<string> {
    if (!this.verifierContract) return '0';

    try {
      const earnings = await this.verifierContract.studentEarnings(studentAddress);
      return formatEther(earnings);
    } catch (error) {
      console.error('Failed to get student earnings:', error);
      return '0';
    }
  }

  /**
   * Withdraw student earnings
   */
  async withdrawEarnings(): Promise<{ success: boolean; error?: string }> {
    if (!this.provider || !this.verifierContract) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const signer = await this.provider.getSigner();
      const verifierWithSigner = this.verifierContract.connect(signer) as Contract;

      const tx = await verifierWithSigner.withdrawEarnings();
      await tx.wait();

      return { success: true };
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      return { success: false, error: error.message || 'Withdrawal failed' };
    }
  }

  /**
   * Fetch IPFS data after verification
   */
  async fetchIPFSData(ipfsHash: string): Promise<any> {
    try {
      const response = await fetch(`https://ipfs.io/ipfs/${ipfsHash}`);
      if (!response.ok) throw new Error('Failed to fetch IPFS data');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch IPFS data:', error);
      return null;
    }
  }
}

// Singleton instance
export const verificationService = new VerificationService();
