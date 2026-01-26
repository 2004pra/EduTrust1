import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FlowDiagram } from '@/components/FlowDiagram';
import { Header } from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, ArrowRight, Shield, Bot, Coins, Zap, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: Shield,
    title: 'ERC-1155 Credentials',
    description: 'Immutable, on-chain educational achievements that cannot be forged or revoked.',
  },
  {
    icon: Bot,
    title: 'Agent-to-Agent Protocol',
    description: 'Autonomous verification between hiring agents and student vaults via x402.',
  },
  {
    icon: Coins,
    title: 'x402 Payments',
    description: 'HTTP 402 payment standard for machine-native credential monetization.',
  },
  {
    icon: Zap,
    title: 'Monad Powered',
    description: 'Built on Monad Testnet for high throughput and low latency verification.',
  },
  {
    icon: Globe,
    title: 'IPFS Storage',
    description: 'Decentralized credential data storage with on-chain verification hashes.',
  },
  {
    icon: Lock,
    title: 'Trustless Access',
    description: 'Payment confirmation required before credential data release. No intermediaries.',
  },
];

export default function Index() {
  const { isConnected, isConnecting, connect } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Hero Section - Split Layout */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 animated-gradient-bg" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-protocol/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 pt-24 pb-16 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Side - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="badge-protocol">
                  <span className="h-1.5 w-1.5 rounded-full bg-protocol animate-pulse" />
                  Built on Monad Testnet
                </span>
              </motion.div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                  <span className="text-gradient">Trustless,</span>
                  <br />
                  <span className="text-foreground">Machine-Verifiable</span>
                  <br />
                  <span className="text-foreground">Education</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-lg">
                  ERC-1155 credentials. x402 payments. Autonomous verification.
                  The protocol for agent-to-agent credential exchange.
                </p>
              </div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4"
              >
                {isConnected ? (
                  <Link to="/vault">
                    <Button variant="hero" size="xl" className="gap-2">
                      Open Your Vault
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={connect}
                    disabled={isConnecting}
                    className="gap-2"
                  >
                    <Wallet className="h-5 w-5" />
                    {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
                  </Button>
                )}
                <Link to="/vault">
                  <Button variant="outline" size="xl" className="gap-2">
                    Explore Student Vault
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex gap-8 pt-8 border-t border-border"
              >
                <div>
                  <p className="text-3xl font-bold text-gradient">12.4k</p>
                  <p className="text-sm text-muted-foreground">Credentials Minted</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gradient">847</p>
                  <p className="text-sm text-muted-foreground">Active Agents</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-gradient">2.1k</p>
                  <p className="text-sm text-muted-foreground">MON Settled</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Side - Flow Diagram */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="card-protocol p-8">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">A2A Verification Flow</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    How credentials move from issuers to verified access
                  </p>
                </div>
                <FlowDiagram />
              </div>

              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1, type: 'spring' }}
                className="absolute -top-4 -right-4 px-4 py-2 rounded-xl bg-success/10 border border-success/20 backdrop-blur-sm"
              >
                <span className="text-sm font-medium text-success">Live on Testnet</span>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Protocol-Grade Infrastructure
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for autonomous agents. Designed for trustless verification.
              Powered by Monad's high-performance blockchain.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -4 }}
                className="card-protocol p-6"
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Build the Future of Credentials?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Connect your wallet to start minting, storing, and monetizing educational achievements.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/issuer">
                <Button variant="hero" size="lg" className="gap-2">
                  Start Issuing
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/verify">
                <Button variant="outline" size="lg" className="gap-2">
                  Verify a Credential
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <span className="text-lg font-bold">EduTrust</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 EduTrust Protocol. Built on Monad Testnet.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Docs
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Discord
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
