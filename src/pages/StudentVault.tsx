
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NFTCard } from '@/components/NFTCard';
import { useWallet } from '@/contexts/WalletContext';
import { Header } from '@/components/Header';
import { verificationService, CredentialData } from '@/services/VerificationService';
import { Wallet, Shield, Coins, AlertCircle, Loader2 } from 'lucide-react';

// Type definition for credential display
interface Credential {
  title: string;
  issuer: string;
  tokenId: string;
  price: string;
  timesVerified?: number;
  totalEarned?: string;
  description?: string;
  image?: string;
  ipfsCid?: string;
}

export default function StudentVault() {
  const { isConnected, address, balance, connect, formatAddress } = useWallet();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load credentials from BLOCKCHAIN (not localStorage!)
    const loadCredentials = async () => {
      if (!isConnected || !address) {
        setCredentials([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Wait a bit for the provider to initialize
        await new Promise(resolve => setTimeout(resolve, 500));

        // Fetch credentials from the blockchain
        const blockchainCredentials = await verificationService.getStudentCredentials(address);

        // Transform blockchain data to display format
        const displayCredentials: Credential[] = blockchainCredentials.map((cred: CredentialData) => ({
          title: cred.title,
          issuer: cred.issuer,
          tokenId: cred.tokenId.toString(),
          price: '0.1', // Default verification price
          ipfsCid: cred.ipfsHash,
          timesVerified: 0,
          totalEarned: '0',
        }));

        setCredentials(displayCredentials);
      } catch (e) {
        console.error("Failed to load credentials from blockchain", e);
        setError("Failed to load credentials. Make sure you're connected to Monad Testnet.");
      } finally {
        setIsLoading(false);
      }
    };

    loadCredentials();
  }, [isConnected, address]);


  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-screen pt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md mx-auto px-6"
          >
            <div className="h-20 w-20 rounded-2xl bg-secondary border border-border flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Access Your Vault</h1>
            <p className="text-muted-foreground mb-6">
              Connect MetaMask to view your credentials.
            </p>
            <Button variant="hero" size="lg" onClick={connect} className="gap-2">
              <Wallet className="h-5 w-5" />
              Connect MetaMask
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Student Vault</h1>
              <p className="text-muted-foreground font-mono">{formatAddress(address!)}</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary border border-border">
              <Coins className="h-5 w-5 text-primary" />
              <span className="font-mono font-semibold">{parseFloat(balance).toFixed(4)} MON</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <div className="card-protocol p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold">{credentials.length}</p>
            <p className="text-sm text-muted-foreground">Credentials</p>
          </div>
        </motion.div>

        {/* Credentials Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Your Credentials</h2>
            <span className="text-sm text-muted-foreground">
              {credentials.length} items
            </span>
          </div>

          {credentials.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-secondary/20">
              <div className="bg-background p-4 rounded-full inline-flex mb-4">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Credentials Found</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                You haven't received any credentials yet. Once an issuer mints a credential for you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {credentials.map((credential, index) => (
                <NFTCard
                  key={credential.tokenId || index}
                  {...credential}
                  timesVerified={credential.timesVerified || 0}
                  totalEarned={credential.totalEarned || "0"}
                  index={index}
                />
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
