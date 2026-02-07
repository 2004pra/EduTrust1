import { ethers, BrowserProvider, Contract } from 'ethers';

// Contract Addresses - Monad Testnet
export const MARKETPLACE_ADDRESSES = {
    EduNotes: '0x15B93e8305D4653C2042927D993D5Dc47DBD9C8f',
    NotesMarketplace: '0x949f11dC2415C8b42d58f3d97F86762E75bA6F58',
} as const;

// Contract Configuration
export const MARKETPLACE_CONFIG = {
    minPrice: 10,  // MON
    maxPrice: 100, // MON
    minWithdrawal: 50, // MON
    platformFee: 500, // 5% in basis points
    creatorRoyalty: 500, // 5% in basis points
    chainId: 10143,
    network: 'monad-testnet',
} as const;

// EduNotes ABI (Only the functions we need)
export const EDU_NOTES_ABI = [
    // Read functions
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    'function getNoteBasic(uint256 tokenId) view returns (string title, string subject, string description, address creator, uint256 createdAt)',
    'function getNoteDetails(uint256 tokenId) view returns (string ipfsHash, string previewHash, address currentOwner)',
    'function getCreatorNotes(address creator) view returns (uint256[])',
    'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)',
    'function totalMinted() view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',

    // Write functions
    'function mintNote(string title, string subject, string description, string ipfsHash, string previewHash) returns (uint256)',
    'function approve(address to, uint256 tokenId)',
    'function setApprovalForAll(address operator, bool approved)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',

    // Events
    'event NoteMinted(uint256 indexed tokenId, address indexed creator, string title, string subject, string ipfsHash)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// ... (skipping some unchanged lines if possible, but replace_file_content works better with contiguous blocks)
// I will just replace the ABI definition block first.
// Wait, I need to update getNoteMetadata too, which is further down.
// I will do two replaces or one big one? 
// getNoteMetadata is around line 138. ABI is around line 20.
// I'll do ABI first.


// NotesMarketplace ABI (Only the functions we need)
export const NOTES_MARKETPLACE_ABI = [
    // Read functions
    'function listings(uint256 tokenId) view returns (address seller, uint256 price, uint256 listedAt, bool isActive)',
    'function earnings(address) view returns (uint256)',
    'function platformFee() view returns (uint256)',
    'function minPrice() view returns (uint256)',
    'function maxPrice() view returns (uint256)',
    'function minWithdrawal() view returns (uint256)',
    'function feeRecipient() view returns (address)',
    'function getActiveListings(uint256 offset, uint256 limit) view returns (uint256[])',
    'function getSellerListings(address seller) view returns (uint256[])',
    'function getTransactionHistory(uint256 tokenId) view returns (tuple(address buyer, address seller, uint256 price, uint256 timestamp)[])',

    // Write functions
    'function listNote(uint256 tokenId, uint256 price)',
    'function delistNote(uint256 tokenId)',
    'function buyNote(uint256 tokenId) payable',
    'function withdrawEarnings()',

    // Admin functions
    'function setPlatformFee(uint256 newFee)',
    'function setFeeRecipient(address newRecipient)',

    // Events
    'event NoteListed(uint256 indexed tokenId, address indexed seller, uint256 price)',
    'event NoteDelisted(uint256 indexed tokenId)',
    'event NoteSold(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price)',
    'event EarningsWithdrawn(address indexed user, uint256 amount)',
];

// Type definitions
export interface NoteMetadata {
    tokenId: number;
    title: string;
    subject: string;
    description: string;
    ipfsHash: string;
    previewHash: string;
    creator: string;
    createdAt: number;
    currentOwner: string;
}

export interface NoteListing {
    tokenId: number;
    seller: string;
    price: string; // In MON
    isActive: boolean;
    listedAt: number;
    note?: NoteMetadata;
}

export interface TransactionRecord {
    buyer: string;
    seller: string;
    price: string;
    timestamp: number;
}

// Helper to get provider from window.ethereum
async function getProvider(): Promise<BrowserProvider> {
    if (typeof window.ethereum === 'undefined') {
        throw new Error('Please install MetaMask or another Web3 wallet');
    }
    return new BrowserProvider(window.ethereum);
}

// Helper to get signer
async function getSigner() {
    const provider = await getProvider();
    return provider.getSigner();
}

// Get EduNotes contract instance
async function getEduNotesContract(signer?: ethers.Signer) {
    if (signer) {
        return new Contract(MARKETPLACE_ADDRESSES.EduNotes, EDU_NOTES_ABI, signer);
    }
    const provider = await getProvider();
    return new Contract(MARKETPLACE_ADDRESSES.EduNotes, EDU_NOTES_ABI, provider);
}

// Get NotesMarketplace contract instance
async function getMarketplaceContract(signer?: ethers.Signer) {
    if (signer) {
        return new Contract(MARKETPLACE_ADDRESSES.NotesMarketplace, NOTES_MARKETPLACE_ABI, signer);
    }
    const provider = await getProvider();
    return new Contract(MARKETPLACE_ADDRESSES.NotesMarketplace, NOTES_MARKETPLACE_ABI, provider);
}

// ============ READ FUNCTIONS ============

/**
 * Get note metadata by token ID
 */
export async function getNoteMetadata(tokenId: number): Promise<NoteMetadata> {
    const contract = await getEduNotesContract();

    const [basic, details] = await Promise.all([
        contract.getNoteBasic(tokenId),
        contract.getNoteDetails(tokenId),
    ]);

    return {
        tokenId,
        title: basic.title,
        subject: basic.subject,
        description: basic.description || '',
        creator: basic.creator,
        createdAt: Number(basic.createdAt),
        ipfsHash: details.ipfsHash,
        previewHash: details.previewHash,
        currentOwner: details.currentOwner,
    };
}

/**
 * Get all notes created by a specific address
 */
export async function getCreatorNotes(creatorAddress: string): Promise<number[]> {
    const contract = await getEduNotesContract();
    const tokenIds = await contract.getCreatorNotes(creatorAddress);
    return tokenIds.map((id: bigint) => Number(id));
}

/**
 * Get listing details for a token
 */
export async function getListing(tokenId: number): Promise<NoteListing | null> {
    const contract = await getMarketplaceContract();
    const listing = await contract.listings(tokenId);

    if (!listing.isActive) {
        return null;
    }

    return {
        tokenId: tokenId, // tokenId is passed in, not returned
        seller: listing.seller,
        price: ethers.formatEther(listing.price),
        isActive: listing.isActive,
        listedAt: Number(listing.listedAt),
    };
}

/**
 * Get all active listings with pagination
 */
export async function getActiveListings(offset = 0, limit = 50): Promise<NoteListing[]> {
    const contract = await getMarketplaceContract();

    try {
        const tokenIds = await contract.getActiveListings(offset, limit);

        const listings: NoteListing[] = [];
        for (const tokenId of tokenIds) {
            const listing = await getListing(Number(tokenId));
            if (listing) {
                const note = await getNoteMetadata(Number(tokenId));
                listings.push({ ...listing, note });
            }
        }

        return listings;
    } catch (error) {
        console.error('Error fetching active listings:', error);
        return [];
    }
}

/**
 * Get user's pending earnings
 */
export async function getUserEarnings(userAddress: string): Promise<string> {
    const contract = await getMarketplaceContract();
    const earnings = await contract.earnings(userAddress);
    return ethers.formatEther(earnings);
}

/**
 * Get transaction history for a token
 */
export async function getTransactionHistory(tokenId: number): Promise<TransactionRecord[]> {
    const contract = await getMarketplaceContract();
    const history = await contract.getTransactionHistory(tokenId);

    return history.map((tx: any) => ({
        buyer: tx.buyer,
        seller: tx.seller,
        price: ethers.formatEther(tx.price),
        timestamp: Number(tx.timestamp),
    }));
}

// ============ WRITE FUNCTIONS ============

/**
 * Mint a new note NFT
 */
export async function mintNote(
    title: string,
    subject: string,
    description: string,
    ipfsHash: string,
    previewHash: string = ''
): Promise<{ tokenId: number; txHash: string }> {
    const signer = await getSigner();
    const contract = await getEduNotesContract(signer);

    const tx = await contract.mintNote(title, subject, description, ipfsHash, previewHash);
    const receipt = await tx.wait();

    // Fallback: Get the token ID by checking total supply (as IDs are sequential)
    // Since we just minted, the last token ID is (totalSupply - 1)
    try {

        // Let's use the event log method first, but correctly this time
        const mintEvent = receipt.logs.find((log: any) => {
            try {
                const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
                return parsed?.name === 'NoteMinted';
            } catch {
                return false;
            }
        });

        if (mintEvent) {
            const parsed = contract.interface.parseLog({ topics: mintEvent.topics, data: mintEvent.data });
            return {
                tokenId: Number(parsed?.args.tokenId),
                txHash: receipt.hash,
            };
        }

        // If event parsing fails, try to get the latest token ID for the user
        const signerAddress = await signer.getAddress();
        const userBalance = await contract.balanceOf(signerAddress);
        if (userBalance > 0n) {
            // Get the last token owned by the user (most recently minted)
            // ERC721Enumerable allows tokenOfOwnerByIndex
            const index = userBalance - 1n;
            const lastTokenId = await contract.tokenOfOwnerByIndex(signerAddress, index);
            return {
                tokenId: Number(lastTokenId),
                txHash: receipt.hash,
            };
        }

    } catch (e) {
        console.error("Error fetching token ID:", e);
    }

    // If all else fails, default to 0 (but log error)
    console.error("Failed to detect Token ID from mint transaction!");
    return {
        tokenId: 0,
        txHash: receipt.hash,
    };
}

/**
 * List a note for sale on the marketplace
 */
export async function listNoteForSale(tokenId: number, priceInMon: number): Promise<string> {
    if (priceInMon < MARKETPLACE_CONFIG.minPrice || priceInMon > MARKETPLACE_CONFIG.maxPrice) {
        throw new Error(`Price must be between ${MARKETPLACE_CONFIG.minPrice} and ${MARKETPLACE_CONFIG.maxPrice} MON`);
    }

    const signer = await getSigner();
    const signerAddress = await signer.getAddress();

    // First approve the marketplace to transfer the NFT
    const eduNotesContract = await getEduNotesContract(signer);
    const isApproved = await eduNotesContract.isApprovedForAll(signerAddress, MARKETPLACE_ADDRESSES.NotesMarketplace);

    if (!isApproved) {
        const approveTx = await eduNotesContract.setApprovalForAll(MARKETPLACE_ADDRESSES.NotesMarketplace, true);
        await approveTx.wait();
    }

    // Now list the note
    const marketplaceContract = await getMarketplaceContract(signer);
    const priceInWei = ethers.parseEther(priceInMon.toString());

    const tx = await marketplaceContract.listNote(tokenId, priceInWei);
    const receipt = await tx.wait();

    return receipt.hash;
}

/**
 * Remove a note from sale
 */
export async function delistNote(tokenId: number): Promise<string> {
    const signer = await getSigner();
    const contract = await getMarketplaceContract(signer);

    const tx = await contract.delistNote(tokenId);
    const receipt = await tx.wait();

    return receipt.hash;
}

/**
 * Buy a listed note
 */
export async function buyNote(tokenId: number, priceInMon: string): Promise<string> {
    const signer = await getSigner();
    const contract = await getMarketplaceContract(signer);

    const priceInWei = ethers.parseEther(priceInMon);

    const tx = await contract.buyNote(tokenId, { value: priceInWei });
    const receipt = await tx.wait();

    return receipt.hash;
}

/**
 * Withdraw accumulated earnings
 */
export async function withdrawEarnings(): Promise<string> {
    const signer = await getSigner();
    const signerAddress = await signer.getAddress();

    // Check if user has enough earnings
    const contract = await getMarketplaceContract(signer);
    const earnings = await contract.earnings(signerAddress);
    const earningsInMon = Number(ethers.formatEther(earnings));

    if (earningsInMon < MARKETPLACE_CONFIG.minWithdrawal) {
        throw new Error(`Minimum withdrawal is ${MARKETPLACE_CONFIG.minWithdrawal} MON. Current balance: ${earningsInMon.toFixed(2)} MON`);
    }

    const tx = await contract.withdrawEarnings();
    const receipt = await tx.wait();

    return receipt.hash;
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate fee breakdown for a sale
 */
export function calculateFees(priceInMon: number) {
    const platformFee = priceInMon * (MARKETPLACE_CONFIG.platformFee / 10000);
    const creatorRoyalty = priceInMon * (MARKETPLACE_CONFIG.creatorRoyalty / 10000);
    const sellerReceives = priceInMon - platformFee - creatorRoyalty;

    return {
        platformFee,
        creatorRoyalty,
        sellerReceives,
        total: priceInMon,
    };
}

/**
 * Format IPFS hash to gateway URL
 */
export function getIpfsUrl(hash: string): string {
    if (!hash) return '';
    if (hash.startsWith('http')) return hash;
    // Use a public gateway
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

/**
 * Check if user is connected to correct network
 */
export async function isCorrectNetwork(): Promise<boolean> {
    try {
        const provider = await getProvider();
        const network = await provider.getNetwork();
        return Number(network.chainId) === MARKETPLACE_CONFIG.chainId;
    } catch {
        return false;
    }
}

/**
 * Permanently remove (burn) a note by transferring to dead address
 */
export async function burnNote(tokenId: number): Promise<string> {
    const signer = await getSigner();
    // Get contract with signer - need to recreate instance to be sure we have signer
    const contract = new Contract(MARKETPLACE_ADDRESSES.EduNotes, EDU_NOTES_ABI, signer);

    const ownerAddress = await signer.getAddress();
    const BURN_ADDRESS = "0x000000000000000000000000000000000000dEaD";

    // Call safeTransferFrom. In ethers v6, we access overloaded functions via string key
    const tx = await contract["safeTransferFrom(address,address,uint256)"](ownerAddress, BURN_ADDRESS, tokenId);
    const receipt = await tx.wait();

    return receipt.hash;
}
