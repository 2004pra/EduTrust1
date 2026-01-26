import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { VerificationStepper } from '@/components/VerificationStepper';
import { Header } from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { verificationService, CredentialData } from '@/services/VerificationService';
import { computeFileCID } from '@/lib/ipfs';
import {
  Upload,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  Shield,
  ExternalLink,
  FileText,
  GraduationCap,
  Hash,
  Loader2
} from 'lucide-react';

type VerificationStep = 'request' | '402' | 'pay' | 'retry' | 'verified';

// Credential type for verification display
interface VerificationCredential {
  tokenId: number | string;
  title: string;
  issuer: string;
  ipfsCid: string;
  studentAddress: string;
  issuedAt: Date;
  price?: string;
}

export default function VerificationPage() {
  const { isConnected, connect, address } = useWallet();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState<VerificationStep>('request');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRequestedVerification, setHasRequestedVerification] = useState(false);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [computedCID, setComputedCID] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  // Matched credential
  const [credential, setCredential] = useState<VerificationCredential | null>(null);
  const [manualStudentAddress, setManualStudentAddress] = useState(''); // Fallback for address
  const [verificationResult, setVerificationResult] = useState<{
    accessHash?: string;
    transactionHash?: string;
    expiresAt?: Date;
  } | null>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setError(null);
    setIsHashing(true);

    try {
      // Compute the IPFS CID (hash) from the file
      const cid = await computeFileCID(file);
      setComputedCID(cid);

      // Look up credential by CID on the BLOCKCHAIN (not localStorage!)
      const blockchainCredential = await verificationService.findCredentialByIPFSHash(cid);

      if (blockchainCredential) {
        // Transform to verification display format
        const foundCredential: VerificationCredential = {
          tokenId: blockchainCredential.tokenId,
          title: blockchainCredential.title,
          issuer: blockchainCredential.issuer,
          ipfsCid: blockchainCredential.ipfsHash,
          studentAddress: blockchainCredential.owner || '',
          issuedAt: blockchainCredential.issuedAt,
          price: '0.1',
        };
        setCredential(foundCredential);

        // Check if user already has access (if wallet is connected)
        if (address) {
          const hasAccess = await verificationService.checkAccess(address, blockchainCredential.tokenId);
          if (hasAccess) {
            setVerificationResult({
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Access is active
            });
            setCurrentStep('verified');
            return;
          }
        }

        setCurrentStep('402');
      } else {
        setError(`No credential found on blockchain for document hash: ${cid.slice(0, 20)}...`);
      }
    } catch (err) {
      console.error('Failed to verify document:', err);
      setError('Failed to process document. Make sure you are connected to Monad Testnet.');
    } finally {
      setIsHashing(false);
    }
  }, [address]);

  const handlePay = useCallback(async () => {
    if (!credential) return;

    // Use the auto-detected address OR the manually entered one
    const targetStudentAddress = credential.studentAddress || manualStudentAddress;

    if (!targetStudentAddress) {
      setError("Please enter the student's wallet address below.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStep('pay');

    try {
      const tokenId = typeof credential.tokenId === 'string'
        ? Number(credential.tokenId)
        : credential.tokenId;

      if (Number.isNaN(tokenId)) {
        setError('Invalid credential token ID');
        setIsProcessing(false);
        setCurrentStep('request');
        return;
      }

      console.log("Starting verification for:", tokenId, "Student:", targetStudentAddress);

      const result = await verificationService.requestVerification(
        tokenId,
        targetStudentAddress
      );

      if (result.success) {
        setVerificationResult({
          accessHash: result.accessHash,
          transactionHash: result.transactionHash,
          expiresAt: result.expiresAt,
        });
        setCurrentStep('retry');

        await new Promise(resolve => setTimeout(resolve, 1500));
        setCurrentStep('verified');
      } else {
        setError(result.error || 'Verification payment failed');
        setCurrentStep('402');
      }
    } catch (err: unknown) {
      const message = typeof err === 'object' && err !== null && 'message' in err
        ? String((err as { message?: unknown }).message || '')
        : '';
      setError(message || 'Payment failed');
      setCurrentStep('402');
    } finally {
      setIsProcessing(false);
    }
  }, [credential, manualStudentAddress]);

  const resetFlow = useCallback(() => {
    setCurrentStep('request');
    setSelectedFile(null);
    setComputedCID(null);
    setCredential(null);
    setVerificationResult(null);
    setError(null);
    setHasRequestedVerification(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRequestVerification = useCallback(() => {
    setHasRequestedVerification(true);
    triggerFileInput();
  }, [triggerFileInput]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold mb-4">Credential Verification</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Upload a credential document to verify its authenticity using x402 payment protocol.
              Pay $MON to access verified IPFS data.
            </p>
          </div>

          {/* Stepper */}
          <div className="mb-12">
            <VerificationStepper currentStep={currentStep} />
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
            >
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-destructive">{error}</span>
              </div>
            </motion.div>
          )}

          {/* Main Card */}
          <div className="card-protocol overflow-hidden">
            <AnimatePresence mode="wait">
              {/* Request Step - Upload Document */}
              {currentStep === 'request' && (
                <motion.div
                  key="request"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">Request Verification</h2>
                        <p className="text-sm text-muted-foreground">
                          Start by requesting verification, then upload your credential document.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="hero"
                      size="sm"
                      onClick={handleRequestVerification}
                      disabled={isHashing}
                    >
                      Ask to Verify
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {/* Drop zone / Upload area */}
                    <div
                      onClick={() => {
                        if (!hasRequestedVerification) {
                          setHasRequestedVerification(true);
                        }
                        triggerFileInput();
                      }}
                      className={`border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer group ${!hasRequestedVerification ? 'opacity-80' : ''
                        }`}
                    >
                      {isHashing ? (
                        <div className="flex flex-col items-center">
                          <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                          <p className="text-lg font-medium">Computing document hash...</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Generating IPFS CID for verification
                          </p>
                        </div>
                      ) : selectedFile ? (
                        <div className="flex flex-col items-center">
                          <FileText className="h-12 w-12 text-primary mb-4" />
                          <p className="text-lg font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(selectedFile.size / 1024).toFixed(1)} KB
                          </p>
                          {computedCID && (
                            <div className="mt-4 p-3 rounded-lg bg-secondary flex items-center gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground" />
                              <code className="text-xs font-mono">{computedCID.slice(0, 24)}...</code>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="h-12 w-12 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                          <p className="text-lg font-medium">Click to upload credential</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            PDF, PNG, JPG, or JSON • Max 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* 402 Payment Required Step */}
              {currentStep === '402' && credential && (
                <motion.div
                  key="402"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* Blurred Preview */}
                  <div className="relative p-8">
                    <div className="flex items-start gap-4 blur-sm select-none">
                      <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-primary/50" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">{credential.title}</h3>
                        <p className="text-muted-foreground">{credential.issuer}</p>
                        <div className="flex items-center gap-4 mt-4">
                          <span className="text-sm font-mono">Token #{credential.tokenId}</span>
                          <span className="text-sm font-mono">{credential.studentAddress.slice(0, 10)}...</span>
                        </div>
                      </div>
                    </div>

                    {/* 402 Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                      <div className="text-center">
                        <div className="h-16 w-16 rounded-full bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto mb-4">
                          <Lock className="h-8 w-8 text-warning" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">402 Payment Required</h3>
                        <p className="text-muted-foreground mb-1">Pay to access verified credential data</p>
                        <p className="text-2xl font-bold text-gradient">0.1 MON</p>

                        {computedCID && (
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/80 border border-border">
                            <Hash className="h-3.5 w-3.5 text-protocol" />
                            <code className="text-xs font-mono">{computedCID.slice(0, 16)}...</code>
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Manual Address Input (Fallback) */}
                  {!credential.studentAddress && (
                    <div className="p-6 pb-0">
                      <label className="text-sm font-medium mb-2 block text-warning">
                        Student Address Required
                      </label>
                      <p className="text-xs text-muted-foreground mb-3">
                        We couldn't detect the student's wallet address from the blockchain history.
                        Please enter it manually to ensure they receive their certification fee.
                      </p>
                      <input
                        type="text"
                        placeholder="0x..."
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={manualStudentAddress}
                        onChange={(e) => setManualStudentAddress(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Payment Action */}
                  <div className="p-6 border-t border-border bg-secondary/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-sm text-warning">Payment settlement required</span>
                      </div>
                      <span className="font-mono text-sm">0.1 MON</span>
                    </div>

                    {isConnected ? (
                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full gap-2"
                        onClick={handlePay}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-5 w-5" />
                            Pay & Verify
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button variant="hero" size="lg" className="w-full gap-2" onClick={connect}>
                        Connect MetaMask to Pay
                      </Button>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Pay/Retry Steps (Processing UI) */}
              {(currentStep === 'pay' || currentStep === 'retry') && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-12 text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
                  >
                    <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  </motion.div>
                  <h3 className="text-xl font-semibold mb-2">
                    {currentStep === 'pay' ? 'Payment Settlement' : 'Verifying On-Chain...'}
                  </h3>
                  <p className="text-muted-foreground">
                    {currentStep === 'pay'
                      ? 'Confirming payment on Monad Testnet...'
                      : 'Fetching verified data from IPFS...'}
                  </p>
                </motion.div>
              )}

              {/* Verified Step */}
              {currentStep === 'verified' && credential && (
                <motion.div
                  key="verified"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8"
                >
                  {/* Success Banner */}
                  <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-3 p-4 rounded-xl bg-success/10 border border-success/20 mb-6"
                  >
                    <CheckCircle2 className="h-6 w-6 text-success" />
                    <div>
                      <p className="font-semibold text-success">Access Granted</p>
                      <p className="text-sm text-success/80">Payment confirmed. Credential data unlocked.</p>
                    </div>
                  </motion.div>

                  {/* Credential Details */}
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Shield className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{credential.title}</h3>
                        <p className="text-muted-foreground">{credential.issuer}</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      <div className="p-4 rounded-xl bg-secondary">
                        <p className="text-xs text-muted-foreground mb-1">Token ID</p>
                        <p className="font-mono">#{credential.tokenId}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary">
                        <p className="text-xs text-muted-foreground mb-1">Student Address</p>
                        <p className="font-mono">{credential.studentAddress}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary">
                        <p className="text-xs text-muted-foreground mb-1">IPFS CID (Document Hash)</p>
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-sm truncate">{credential.ipfsCid}</p>
                          <a
                            href={`https://ipfs.io/ipfs/${credential.ipfsCid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                          >
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-secondary">
                        <p className="text-xs text-muted-foreground mb-1">Issued At</p>
                        <p className="font-mono">{credential.issuedAt.toLocaleDateString()}</p>
                      </div>
                      {verificationResult?.transactionHash && (
                        <div className="p-4 rounded-xl bg-secondary">
                          <p className="text-xs text-muted-foreground mb-1">Transaction Hash</p>
                          <div className="flex items-center justify-between">
                            <p className="font-mono text-sm truncate">{verificationResult.transactionHash}</p>
                            <a
                              href={`https://testnet.monadexplorer.com/tx/${verificationResult.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-card-hover transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 text-muted-foreground" />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Verified Document Preview */}
                    <div className="p-6 rounded-xl border border-success/20 bg-success/5">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="h-5 w-5 text-success" />
                        <span className="font-medium">Verified Document</span>
                      </div>
                      <div className="aspect-[3/4] rounded-lg bg-card flex items-center justify-center">
                        <div className="text-center">
                          <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Official credential document from IPFS
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" onClick={resetFlow} className="w-full">
                      Verify Another Credential
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div >
  );
}
