import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { verificationService } from '@/services/VerificationService';
import { computeFileCID } from '@/lib/ipfs';
import {
    Upload,
    FileText,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Download,
    DollarSign,
    Hash,
    Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface CredentialToVerify {
    candidateName: string;
    credentialHash: string;
    email?: string;
    rowNumber: number;
}

interface VerificationResult extends CredentialToVerify {
    status: 'verified' | 'not-found' | 'revoked' | 'processing' | 'pending';
    tokenId?: string;
    title?: string;
    issuer?: string;
    studentAddress?: string;
    transactionHash?: string;
    error?: string;
}

export default function BulkVerificationPage() {
    const { isConnected, address, connect } = useWallet();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [credentials, setCredentials] = useState<CredentialToVerify[]>([]);
    const [results, setResults] = useState<VerificationResult[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isHashing, setIsHashing] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [totalCost, setTotalCost] = useState('0');

    const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setIsHashing(true);
        const newCredentials: CredentialToVerify[] = [];

        try {
            // Process each file
            for (let i = 0; i < files.length; i++) {
                const file = files[i];

                // Compute hash for each file
                const cid = await computeFileCID(file);

                newCredentials.push({
                    candidateName: file.name, // Use filename as candidate name reference
                    credentialHash: cid,
                    rowNumber: i + 1,
                });
            }

            setCredentials(newCredentials);
            setResults(newCredentials.map(c => ({ ...c, status: 'pending' })));
            setTotalCost((newCredentials.length * 0.1).toFixed(2));
            toast.success(`Broadcasting ${newCredentials.length} documents for verification`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to process some files');
        } finally {
            setIsHashing(false);
        }
    }, []);

    const processVerifications = useCallback(async () => {
        if (!isConnected || credentials.length === 0) return;

        setIsProcessing(true);
        setCurrentIndex(0);

        for (let i = 0; i < credentials.length; i++) {
            // ... (rest of logic similar, just updating state)
            setCurrentIndex(i + 1);
            const cred = credentials[i];

            // Update status to processing
            setResults(prev => prev.map((r, idx) =>
                idx === i ? { ...r, status: 'processing' } : r
            ));

            try {
                // Find credential by hash
                const blockchainCred = await verificationService.findCredentialByIPFSHash(cred.credentialHash);

                if (!blockchainCred) {
                    // Not found
                    setResults(prev => prev.map((r, idx) =>
                        idx === i ? { ...r, status: 'not-found', error: 'Credential not found on blockchain' } : r
                    ));
                    continue;
                }

                // Check if already has access
                const hasAccess = await verificationService.checkAccess(address!, blockchainCred.tokenId);

                if (hasAccess) {
                    // Already verified
                    setResults(prev => prev.map((r, idx) =>
                        idx === i ? {
                            ...r,
                            status: 'verified',
                            tokenId: blockchainCred.tokenId.toString(),
                            title: blockchainCred.title,
                            issuer: blockchainCred.issuer,
                            studentAddress: blockchainCred.owner,
                        } : r
                    ));
                    continue;
                }

                // Request verification (pay 0.1 MON)
                const verifyResult = await verificationService.requestVerification(blockchainCred.tokenId);

                if (verifyResult.success) {
                    setResults(prev => prev.map((r, idx) =>
                        idx === i ? {
                            ...r,
                            status: 'verified',
                            tokenId: blockchainCred.tokenId.toString(),
                            title: blockchainCred.title,
                            issuer: blockchainCred.issuer,
                            studentAddress: blockchainCred.owner,
                            transactionHash: verifyResult.transactionHash,
                        } : r
                    ));
                } else {
                    setResults(prev => prev.map((r, idx) =>
                        idx === i ? {
                            ...r,
                            status: 'not-found',
                            error: verifyResult.error || 'Payment failed',
                        } : r
                    ));
                }

                // Small delay between transactions
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err: any) {
                setResults(prev => prev.map((r, idx) =>
                    idx === i ? {
                        ...r,
                        status: 'not-found',
                        error: err.message || 'Processing failed',
                    } : r
                ));
            }
        }

        setIsProcessing(false);
        toast.success('Bulk verification complete!');
    }, [credentials, isConnected, address]);

    const downloadResults = useCallback(() => {
        const csv = [
            'Filename,Credential Hash,Status,Token ID,Title,Issuer,Student Address,Transaction Hash,Error',
            ...results.map(r => [
                r.candidateName,
                r.credentialHash,
                r.status,
                r.tokenId || '',
                r.title || '',
                r.issuer || '',
                r.studentAddress || '',
                r.transactionHash || '',
                r.error || '',
            ].join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk-verification-results-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Results downloaded!');
    }, [results]);

    const resetFlow = useCallback(() => {
        setCredentials([]);
        setResults([]);
        setCurrentIndex(0);
        setTotalCost('0');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, []);

    const verifiedCount = results.filter(r => r.status === 'verified').length;
    const notFoundCount = results.filter(r => r.status === 'not-found').length;
    const revokedCount = results.filter(r => r.status === 'revoked').length;

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <main className="container mx-auto px-6 pt-24 pb-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-5xl mx-auto"
                >
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-bold mb-4">Bulk Credential Verification</h1>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Drag & drop multiple credential files (PDF, JPG, PNG) to verify them all at once.
                            We compute the hash of each file securely in your browser.
                        </p>
                    </div>

                    {/* Upload Section */}
                    {credentials.length === 0 && (
                        <div className="card-protocol p-8">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".pdf,.png,.jpg,.jpeg,.json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            <div
                                onClick={() => !isHashing && fileInputRef.current?.click()}
                                className={`border-2 border-dashed border-border rounded-xl p-16 text-center hover:border-primary/50 transition-colors cursor-pointer group ${isHashing ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {isHashing ? (
                                    <>
                                        <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
                                        <p className="text-lg font-medium mb-2">Analyzing files...</p>
                                        <p className="text-sm text-muted-foreground">Computing IPFS hashes locally</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-16 w-16 text-muted-foreground group-hover:text-primary transition-colors mx-auto mb-4" />
                                        <p className="text-lg font-medium mb-2">Click to select files OR drag & drop</p>
                                        <p className="text-sm text-muted-foreground">
                                            Upload multiple PDF, PNG, or JSON files
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Preview & Process */}
                    {credentials.length > 0 && !isProcessing && results.every(r => r.status === 'pending') && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary Card */}
                            <div className="card-protocol p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-1">Ready to Verify</h3>
                                        <p className="text-muted-foreground">{credentials.length} documents loaded</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground mb-1">Total Cost</p>
                                        <p className="text-3xl font-bold font-mono text-gradient">{totalCost} MON</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {credentials.length} × 0.1 MON each
                                        </p>
                                    </div>
                                </div>

                                {isConnected ? (
                                    <div className="flex gap-3">
                                        <Button
                                            variant="hero"
                                            size="lg"
                                            onClick={processVerifications}
                                            className="flex-1 gap-2"
                                        >
                                            <DollarSign className="h-5 w-5" />
                                            Verify All Documents
                                        </Button>
                                        <Button variant="outline" onClick={resetFlow}>
                                            Clear Selection
                                        </Button>
                                    </div>
                                ) : (
                                    <Button variant="hero" size="lg" onClick={connect} className="w-full gap-2">
                                        Connect Wallet to Continue
                                    </Button>
                                )}
                            </div>

                            {/* Preview Table */}
                            <div className="card-protocol p-6">
                                <h3 className="font-semibold mb-4">Documents Preview</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left p-3">#</th>
                                                <th className="text-left p-3">Filename</th>
                                                <th className="text-left p-3">Credential Hash (Calculated)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {credentials.slice(0, 10).map((cred, idx) => (
                                                <tr key={idx} className="border-b border-border/50">
                                                    <td className="p-3 text-muted-foreground">{idx + 1}</td>
                                                    <td className="p-3 font-medium flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-primary" />
                                                        {cred.candidateName}
                                                    </td>
                                                    <td className="p-3 font-mono text-xs">{cred.credentialHash.slice(0, 30)}...</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {credentials.length > 10 && (
                                        <p className="text-center text-sm text-muted-foreground mt-4">
                                            ... and {credentials.length - 10} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Processing Progress */}
                    {isProcessing && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="card-protocol p-8"
                        >
                            <div className="text-center mb-8">
                                <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-4" />
                                <h3 className="text-2xl font-semibold mb-2">Processing Verifications</h3>
                                <p className="text-muted-foreground">
                                    {currentIndex} of {credentials.length} completed
                                </p>
                            </div>

                            <div className="w-full bg-secondary rounded-full h-3 mb-8">
                                <div
                                    className="bg-gradient-to-r from-primary to-purple-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${(currentIndex / credentials.length) * 100}%` }}
                                />
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {results.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className={`p-3 rounded-lg border ${result.status === 'processing'
                                            ? 'border-primary bg-primary/5'
                                            : result.status === 'verified'
                                                ? 'border-green-500/20 bg-green-500/5'
                                                : result.status === 'not-found'
                                                    ? 'border-red-500/20 bg-red-500/5'
                                                    : 'border-border bg-secondary/30'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {result.status === 'processing' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                                                {result.status === 'verified' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                                {result.status === 'not-found' && <XCircle className="h-4 w-4 text-red-500" />}
                                                {result.status === 'pending' && <Clock className="h-4 w-4 text-muted-foreground" />}
                                                <span className="font-medium">{result.candidateName}</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground capitalize">{result.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Results */}
                    {!isProcessing && results.some(r => r.status !== 'pending') && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Summary Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="card-protocol p-6 text-center">
                                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                    <p className="text-3xl font-bold">{verifiedCount}</p>
                                    <p className="text-sm text-muted-foreground">Verified</p>
                                </div>
                                <div className="card-protocol p-6 text-center">
                                    <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                                    <p className="text-3xl font-bold">{notFoundCount}</p>
                                    <p className="text-sm text-muted-foreground">Not Found</p>
                                </div>
                                <div className="card-protocol p-6 text-center">
                                    <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                                    <p className="text-3xl font-bold">{revokedCount}</p>
                                    <p className="text-sm text-muted-foreground">Revoked</p>
                                </div>
                            </div>

                            {/* Results Table */}
                            <div className="card-protocol p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold">Verification Results</h3>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={downloadResults} className="gap-2">
                                            <Download className="h-4 w-4" />
                                            Download CSV
                                        </Button>
                                        <Button variant="outline" onClick={resetFlow}>
                                            New Batch
                                        </Button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left p-3">Status</th>
                                                <th className="text-left p-3">Candidate</th>
                                                <th className="text-left p-3">Title</th>
                                                <th className="text-left p-3">Issuer</th>
                                                <th className="text-left p-3">Token ID</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((result, idx) => (
                                                <tr key={idx} className="border-b border-border/50">
                                                    <td className="p-3">
                                                        {result.status === 'verified' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs">
                                                                <CheckCircle2 className="h-3 w-3" /> Verified
                                                            </span>
                                                        )}
                                                        {result.status === 'not-found' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs">
                                                                <XCircle className="h-3 w-3" /> Not Found
                                                            </span>
                                                        )}
                                                        {result.status === 'revoked' && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs">
                                                                <AlertTriangle className="h-3 w-3" /> Revoked
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 font-medium">{result.candidateName}</td>
                                                    <td className="p-3">{result.title || '-'}</td>
                                                    <td className="p-3">{result.issuer || '-'}</td>
                                                    <td className="p-3 font-mono text-xs">{result.tokenId || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
}
