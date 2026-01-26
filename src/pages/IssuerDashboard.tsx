import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWallet } from '@/contexts/WalletContext';
import { Header } from '@/components/Header';
import { computeFileCID } from '@/lib/ipfs';
import { verificationService } from '@/services/VerificationService';
import { toast } from 'sonner';
import {
  Wallet, Upload, CheckCircle, AlertTriangle, GraduationCap,
  FileText, Sparkles, DollarSign
} from 'lucide-react';

const credentialTypes = [
  { id: 'degree', label: 'University Degree', icon: GraduationCap },
  { id: 'certification', label: 'Professional Certification', icon: FileText },
  { id: 'bootcamp', label: 'Bootcamp Completion', icon: Sparkles },
];

export default function IssuerDashboard() {
  const { isConnected, address, isCorrectNetwork, connect, switchToMonad, formatAddress, error } = useWallet();

  // Role & Demo States
  const [email, setEmail] = useState('');
  const [isApproved, setIsApproved] = useState(false);
  const [showLogin, setShowLogin] = useState(true);

  // Form States
  const [studentWallet, setStudentWallet] = useState('');
  const [credentialType, setCredentialType] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileCid, setFileCid] = useState('');
  const [price, setPrice] = useState('0.1');
  const [isMinting, setIsMinting] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [lastMintCid, setLastMintCid] = useState<string | null>(null);

  // --- HACKATHON DEMO BYPASS ---
  const handleIssuerLogin = () => {
    if (email === "prashant37364@gmail.com") {
      setIsApproved(true);
      setShowLogin(false);
      toast.success("Demo Access Approved", { description: "University domain verified via bypass." });
    } else if (email.includes('.edu')) {
      // Simulate OTP flow for other edu emails
      toast.info("OTP sent to your college email");
      // For hackathon, any 6 digits work
      setIsApproved(true);
      setShowLogin(false);
    } else {
      toast.error("Please use a valid institutional email or the demo email.");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const cid = await computeFileCID(file);
      setFileCid(cid);
    } catch (err) {
      toast.error("Failed to process file");
    }
  };

  const handleMint = async () => {
    if (!studentWallet || !credentialType || !fileCid) {
      toast.error("Please fill all fields and upload a document");
      return;
    }

    setIsMinting(true);

    // 1. CHECK FOR DUPLICATES ON CHAIN
    const typeLabel = credentialTypes.find((t) => t.id === credentialType)?.label || "Credential";
    const issuerName = email || "Verified Institution";

    try {
      // Check if any token exists with this IPFS CID
      const existing = await verificationService.findCredentialByIPFSHash(fileCid);

      if (existing) {
        // If it exists, check if THIS student already owns it
        const balance = await verificationService.checkBalance(studentWallet, existing.tokenId);

        if (balance > 0) {
          toast.error("Duplicate Credential Check Failed", {
            description: `Student already owns this credential (Token #${existing.tokenId}). Cannot issue twice.`
          });
          setIsMinting(false);
          return;
        } else {
          // Optional: Warn that it exists globally but not for this student
          console.log(`Credential content exists (Token #${existing.tokenId}) but student doesn't own it. Proceeding.`);
        }
      }
    } catch (e) {
      console.warn("Duplicate check failed, proceeding cautiously", e);
    }

    // 2. MINT ON BLOCKCHAIN

    try {
      const result = await verificationService.mintCredential(
        studentWallet,
        typeLabel,
        issuerName,
        fileCid
      );

      if (!result.success || !result.tokenId) {
        throw new Error(result.error || "Minting failed");
      }

      // 2. SAVE TO LOCAL STORAGE (For Verification Demo)
      const newCredential = {
        title: typeLabel,
        issuer: issuerName,
        tokenId: result.tokenId, // Use REAL Token ID
        price,
        timesVerified: 0,
        totalEarned: "0",
        description: `Issued to ${studentWallet}`,
        image: fileName,
        studentAddress: studentWallet,
        ipfsCid: fileCid,
        issuedAt: new Date().toISOString(),
        txHash: result.transactionHash
      };

      const existingRaw = localStorage.getItem("mintedCredentials");
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      localStorage.setItem("mintedCredentials", JSON.stringify([...existing, newCredential]));

      toast.success("Credential Minted Successfully", {
        description: `Token #${result.tokenId} sent to ${studentWallet}`,
      });
      setLastMintCid(fileCid);

      // Reset form
      setMintSuccess(true);
      setTimeout(() => setMintSuccess(false), 3000);

    } catch (err: any) {
      console.error(err);
      toast.error("Minting Failed", {
        description: err.message || "Could not mint credential on-chain"
      });
    } finally {
      setIsMinting(false);
    }
  };

  // 1. Role Selection/Login View
  if (showLogin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-protocol p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-2">Issuer Registration</h2>
            <p className="text-muted-foreground mb-6">Verify your institution to start minting.</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>College Email</Label>
                <Input
                  placeholder="name@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button className="w-full" variant="hero" onClick={handleIssuerLogin}>
                Verify & Continue
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // 2. Wallet Connection View (Fixing the "Click" issue)
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-screen pt-16">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="h-20 w-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-6">
              <Wallet className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Connect Issuer Wallet</h1>
            <p className="text-muted-foreground mb-6">Connect to Monad to sign credential minting transactions.</p>
            {/* FORCE RE-RENDER ON CLICK */}
            <Button variant="hero" size="lg" onClick={() => connect()} className="gap-2">
              <Wallet className="h-5 w-5" />
              Connect MetaMask
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Main Dashboard View
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold mb-2">Issuer Dashboard</h1>
              <p className="text-muted-foreground font-mono text-sm">{formatAddress(address!)}</p>
            </div>
            <div className="badge-success h-fit">Approved Institution</div>
          </div>

          <div className="card-protocol p-6">
            <h2 className="text-xl font-semibold mb-6">Mint New Credential</h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Student Wallet Address</Label>
                <Input placeholder="0x..." value={studentWallet} onChange={(e) => setStudentWallet(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Credential Type</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {credentialTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setCredentialType(type.id)}
                      className={`p-4 rounded-xl border text-left transition-all ${credentialType === type.id ? 'border-primary bg-primary/5' : 'border-border bg-secondary'
                        }`}
                    >
                      <type.icon className="h-5 w-5 mb-2" />
                      <p className="text-sm font-medium">{type.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Credential Document (IPFS)</Label>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center relative">
                  <input type="file" onChange={handleFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm font-medium">{fileName || "Click to upload document"}</p>
                  {fileCid && (
                    <p className="mt-2 text-xs font-mono text-muted-foreground break-all">
                      CID: {fileCid}
                    </p>
                  )}
                </div>
              </div>

              <Button variant="hero" size="lg" className="w-full gap-2" onClick={handleMint} disabled={isMinting || !isCorrectNetwork}>
                {isMinting ? "Minting on Monad..." : "Mint Credential"}
              </Button>
              {lastMintCid && (
                <p className="text-[11px] text-muted-foreground font-mono break-all mt-2">
                  Last minted CID: {lastMintCid}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
