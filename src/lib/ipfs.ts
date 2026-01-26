
/**
 * Mock IPFS CID generator
 * In production, this would use a real IPFS client (e.g., ipfs-http-client, Pinata SDK)
 */

/**
 * Compute a mock "IPFS CID" from file bytes using SHA-256
 * Real IPFS uses a specific multihash format, but this simulates the concept
 */
export async function computeFileCID(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Format as a mock CID (Qm prefix for v0 CIDs)
  // Real CIDs use base58, but we'll use a simplified format
  return `Qm${hashHex.slice(0, 44)}`;
}

/**
 * Credential interface
 */
export interface MockCredential {
  ipfsCid: string;
  tokenId: number | string;
  title: string;
  issuer: string;
  studentAddress: string;
  issuedAt: Date;
  price?: string;
}

/**
 * Look up a credential by IPFS CID
 * Returns null if not found
 */
export function lookupCredentialByCID(cid: string): MockCredential | null {
  try {
    const stored = localStorage.getItem('mintedCredentials');
    if (!stored) return null;
    
    const credentials = JSON.parse(stored);
    const found = credentials.find((c: any) => c.ipfsCid === cid);
    
    if (found) {
      return {
        ...found,
        issuedAt: new Date(found.issuedAt)
      };
    }
    return null;
  } catch (e) {
    console.error('Error looking up credential', e);
    return null;
  }
}

/**
 * Look up a credential by token ID
 */
export function lookupCredentialByTokenId(tokenId: number | string): MockCredential | null {
  try {
    const stored = localStorage.getItem('mintedCredentials');
    if (!stored) return null;
    
    const credentials = JSON.parse(stored);
    // loose equality to handle string vs number
    const found = credentials.find((c: any) => c.tokenId == tokenId);
    
    if (found) {
      return {
        ...found,
        issuedAt: new Date(found.issuedAt)
      };
    }
    return null;
  } catch (e) {
    console.error('Error looking up credential', e);
    return null;
  }
}
