/**
 * IPFS Service - Upload files to IPFS via Pinata
 * 
 * Pinata provides a free tier with:
 * - 1GB storage
 * - 100 files per month
 * - API access
 * 
 * Get your API keys at: https://app.pinata.cloud/developers/api-keys
 */

const PINATA_API_URL = 'https://api.pinata.cloud';
const PINATA_GATEWAY = 'https://gateway.pinata.cloud/ipfs';

// Get credentials from environment variables
const getPinataCredentials = () => {
    const apiKey = import.meta.env.VITE_PINATA_API_KEY;
    const secretKey = import.meta.env.VITE_PINATA_SECRET_KEY;
    const jwt = import.meta.env.VITE_PINATA_JWT;

    if (!jwt && (!apiKey || !secretKey)) {
        console.warn('Pinata credentials not configured. Using mock upload.');
        return null;
    }

    return { apiKey, secretKey, jwt };
};

export interface IpfsUploadResult {
    hash: string;
    url: string;
    size: number;
    name: string;
}

export interface NoteMetadataForIpfs {
    title: string;
    subject: string;
    description: string;
    creator: string;
    createdAt: string;
    fileHash: string;
    previewHash?: string;
    fileType: string;
    fileSize: number;
}

/**
 * Upload a file to IPFS via Pinata
 */
export async function uploadFileToIpfs(
    file: File,
    name?: string
): Promise<IpfsUploadResult> {
    const credentials = getPinataCredentials();

    // If no credentials, return a mock hash for development
    if (!credentials) {
        return mockUpload(file, name);
    }

    const formData = new FormData();
    formData.append('file', file);

    // Add metadata
    const metadata = JSON.stringify({
        name: name || file.name,
        keyvalues: {
            app: 'EduTrust',
            type: 'note-file',
            originalName: file.name,
        }
    });
    formData.append('pinataMetadata', metadata);

    // Pin options
    const options = JSON.stringify({
        cidVersion: 1,
    });
    formData.append('pinataOptions', options);

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
            method: 'POST',
            headers: credentials.jwt
                ? { Authorization: `Bearer ${credentials.jwt}` }
                : {
                    'pinata_api_key': credentials.apiKey!,
                    'pinata_secret_api_key': credentials.secretKey!,
                },
            body: formData,
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Pinata upload failed: ${error}`);
        }

        const result = await response.json();

        return {
            hash: result.IpfsHash,
            url: `${PINATA_GATEWAY}/${result.IpfsHash}`,
            size: result.PinSize,
            name: file.name,
        };
    } catch (error) {
        console.error('IPFS upload error:', error);
        throw error;
    }
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadJsonToIpfs(
    data: NoteMetadataForIpfs,
    name: string
): Promise<IpfsUploadResult> {
    const credentials = getPinataCredentials();

    // If no credentials, return a mock hash for development
    if (!credentials) {
        return mockJsonUpload(data, name);
    }

    try {
        const response = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(credentials.jwt
                    ? { Authorization: `Bearer ${credentials.jwt}` }
                    : {
                        'pinata_api_key': credentials.apiKey!,
                        'pinata_secret_api_key': credentials.secretKey!,
                    }),
            },
            body: JSON.stringify({
                pinataContent: data,
                pinataMetadata: {
                    name,
                    keyvalues: {
                        app: 'EduTrust',
                        type: 'note-metadata',
                        title: data.title,
                        subject: data.subject,
                    }
                },
                pinataOptions: {
                    cidVersion: 1,
                }
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Pinata JSON upload failed: ${error}`);
        }

        const result = await response.json();

        return {
            hash: result.IpfsHash,
            url: `${PINATA_GATEWAY}/${result.IpfsHash}`,
            size: result.PinSize,
            name,
        };
    } catch (error) {
        console.error('IPFS JSON upload error:', error);
        throw error;
    }
}

/**
 * Upload note file and preview image, then create metadata JSON
 */
export async function uploadNoteBundle(
    noteFile: File,
    previewFile: File | null,
    metadata: { title: string; subject: string; description: string; creator: string }
): Promise<{
    fileHash: string;
    previewHash: string;
    metadataHash: string;
    fileUrl: string;
    previewUrl: string;
    metadataUrl: string;
}> {
    // Upload note file
    console.log('Uploading note file to IPFS...');
    const fileResult = await uploadFileToIpfs(noteFile, `${metadata.title}-note`);

    // Upload preview image if provided
    let previewResult: IpfsUploadResult | null = null;
    if (previewFile) {
        console.log('Uploading preview image to IPFS...');
        previewResult = await uploadFileToIpfs(previewFile, `${metadata.title}-preview`);
    }

    // Create and upload metadata JSON
    console.log('Uploading metadata to IPFS...');
    const metadataForIpfs: NoteMetadataForIpfs = {
        title: metadata.title,
        subject: metadata.subject,
        description: metadata.description,
        creator: metadata.creator,
        createdAt: new Date().toISOString(),
        fileHash: fileResult.hash,
        previewHash: previewResult?.hash || '',
        fileType: noteFile.type,
        fileSize: noteFile.size,
    };

    const metadataResult = await uploadJsonToIpfs(
        metadataForIpfs,
        `${metadata.title}-metadata.json`
    );

    return {
        fileHash: fileResult.hash,
        previewHash: previewResult?.hash || '',
        metadataHash: metadataResult.hash,
        fileUrl: fileResult.url,
        previewUrl: previewResult?.url || '',
        metadataUrl: metadataResult.url,
    };
}

/**
 * Get IPFS gateway URL for a hash
 */
export function getIpfsUrl(hash: string): string {
    if (!hash) return '';
    if (hash.startsWith('http')) return hash;
    if (hash.startsWith('ipfs://')) {
        return `${PINATA_GATEWAY}/${hash.replace('ipfs://', '')}`;
    }
    return `${PINATA_GATEWAY}/${hash}`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File, options: {
    maxSize?: number;  // in bytes
    allowedTypes?: string[];
}): { valid: boolean; error?: string } {
    const maxSize = options.maxSize || 50 * 1024 * 1024; // 50MB default
    const allowedTypes = options.allowedTypes || [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];

    if (file.size > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
        };
    }

    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`,
        };
    }

    return { valid: true };
}

// ============ MOCK FUNCTIONS FOR DEVELOPMENT ============

/**
 * Mock file upload for development without Pinata credentials
 */
async function mockUpload(file: File, name?: string): Promise<IpfsUploadResult> {
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a mock CID (looks realistic)
    const mockHash = 'Qm' + generateRandomString(44);

    console.log(`[MOCK] Uploaded file "${name || file.name}" with hash: ${mockHash}`);

    return {
        hash: mockHash,
        url: `${PINATA_GATEWAY}/${mockHash}`,
        size: file.size,
        name: file.name,
    };
}

/**
 * Mock JSON upload for development
 */
async function mockJsonUpload(data: any, name: string): Promise<IpfsUploadResult> {
    await new Promise(resolve => setTimeout(resolve, 500));

    const mockHash = 'Qm' + generateRandomString(44);
    const size = new Blob([JSON.stringify(data)]).size;

    console.log(`[MOCK] Uploaded JSON "${name}" with hash: ${mockHash}`);

    return {
        hash: mockHash,
        url: `${PINATA_GATEWAY}/${mockHash}`,
        size,
        name,
    };
}

/**
 * Generate random string for mock CIDs
 */
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ============ UTILITY FUNCTIONS ============

/**
 * Calculate the approximate IPFS CID from file content
 * (This is a simplified hash, not the actual CID algorithm)
 */
export async function calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
