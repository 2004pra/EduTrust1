
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NFTCard } from '@/components/NFTCard';
import { useWallet } from '@/contexts/WalletContext';
import { Header } from '@/components/Header';
import { verificationService, CredentialData } from '@/services/VerificationService';
import { Wallet, Shield, Coins, AlertCircle, Loader2, TrendingUp, Download, Share2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

// Simulated data generator for the chart
const generateMockData = (currentBalance: number) => {
  const data = [];
  let balance = currentBalance * 0.4; // Start lower
  for (let i = 1; i <= 7; i++) {
    // Random increment to simulate earnings over 7 days
    const increment = Math.random() * (currentBalance * 0.1);
    balance += increment;
    if (i === 7) balance = currentBalance; // Ensure end matches current

    data.push({
      name: `Day ${i}`,
      earnings: parseFloat(balance.toFixed(3)),
    });
  }
  return data;
};

export default function StudentVault() {
  const { isConnected, address, balance, connect, formatAddress } = useWallet();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Earnings state
  const [earnings, setEarnings] = useState<string>('0');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch earnings and credentials
  useEffect(() => {
    const fetchData = async () => {
      if (!isConnected || !address) {
        setCredentials([]);
        setEarnings('0');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        await new Promise(resolve => setTimeout(resolve, 500));

        // 1. Fetch Credentials
        const blockchainCredentials = await verificationService.getStudentCredentials(address);
        const displayCredentials: Credential[] = blockchainCredentials.map((cred: CredentialData) => ({
          title: cred.title,
          issuer: cred.issuer,
          tokenId: cred.tokenId.toString(),
          price: '0.1',
          ipfsCid: cred.ipfsHash,
          timesVerified: Math.floor(Math.random() * 5), // Mock for demo until contract supports history count
          totalEarned: (Math.random() * 0.5).toFixed(2), // Mock
        }));
        setCredentials(displayCredentials);

        // 2. Fetch Earnings
        const currentEarnings = await verificationService.getStudentEarnings(address);
        setEarnings(currentEarnings);

        // 3. Generate Mock Chart Data based on earnings
        // If earnings are 0, show a flat line or small random activity
        const baseValue = parseFloat(currentEarnings) > 0 ? parseFloat(currentEarnings) : 0.05;
        setChartData(generateMockData(baseValue));

      } catch (e) {
        console.error("Failed to load vault data", e);
        setError("Failed to load data. Ensure you are connected to Monad Testnet.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isConnected, address]);

  // Handle Withdraw
  const handleWithdraw = async () => {
    if (parseFloat(earnings) <= 0) return;

    setIsWithdrawing(true);
    try {
      const result = await verificationService.withdrawEarnings();
      if (result.success) {
        setEarnings('0'); // Reset UI after successful withdraw
        setChartData(generateMockData(0)); // Reset chart
        // Optional: Add success toast here if you have toast system
      } else {
        setError(result.error || "Withdrawal failed");
      }
    } catch (e) {
      console.error("Withdraw error", e);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient-bg opacity-30" />
        <Header />
        <div className="flex items-center justify-center min-h-screen pt-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto px-6"
          >
            <div className="h-24 w-24 rounded-3xl bg-primary/10 backdrop-blur-md border border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/10">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Student Vault</h1>
            <p className="text-muted-foreground mb-8 text-lg">
              Connect your wallet to access your secure credentials and track your verification earnings.
            </p>
            <Button variant="hero" size="xl" onClick={connect} className="gap-2 shadow-lg hover:shadow-primary/25">
              <Wallet className="h-5 w-5" />
              Connect Wallet
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
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-muted-foreground">My Vault</h1>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="font-mono text-sm">{formatAddress(address!)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Share2 className="h-4 w-4" /> Share Vault
            </Button>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="h-4 w-4" /> Export Data
            </Button>
          </div>
        </motion.div>

        {/* Analytics & Earnings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">

          {/* Chart Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 card-protocol p-6 min-h-[300px] flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Verification Income
                </h3>
                <p className="text-sm text-muted-foreground">Passive earnings from background checks</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold font-mono">+{parseFloat(earnings).toFixed(4)} MON</p>
                <p className="text-xs text-green-500">+12% this week</p>
              </div>
            </div>

            <div className="flex-1 w-full h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="earnings"
                    stroke="#8b5cf6"
                    fillOpacity={1}
                    fill="url(#colorEarnings)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Withdrawal Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-protocol p-6 flex flex-col justify-between bg-gradient-to-br from-card to-secondary/20"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Available to Withdraw</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Funds are held in the smart contract until you claim them.
              </p>

              <div className="bg-background/50 rounded-lg p-4 mb-6 border border-border/50">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-mono">{earnings} MON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span className="font-mono text-xs">~0.001 MON</span>
                </div>
              </div>
            </div>

            <Button
              variant="hero"
              size="lg"
              onClick={handleWithdraw}
              disabled={parseFloat(earnings) <= 0 || isWithdrawing}
              className="w-full relative overflow-hidden"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                "Claim Earnings"
              )}
            </Button>
          </motion.div>
        </div>

        {/* Credentials Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Credentials</h2>
            <div className="px-3 py-1 rounded-full bg-secondary text-xs font-medium">
              {credentials.length} Tokens
            </div>
          </div>

          {credentials.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-border/50 rounded-3xl bg-secondary/5">
              <div className="bg-secondary/30 p-4 rounded-full inline-flex mb-4">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-medium mb-2">Build Your Portfolio</h3>
              <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                You haven't received any credentials yet. Ask your university to issue credentials to your wallet address.
              </p>
              <Button variant="outline">Learn How to Request</Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

