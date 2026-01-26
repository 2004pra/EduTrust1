import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { FlowDiagram } from '@/components/FlowDiagram';
import { Header } from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { Wallet, ArrowRight, Shield, Bot, Coins, Zap, Globe, Lock, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnimatedLogo } from '@/components/AnimatedLogo';

const features = [
  {
    icon: Shield,
    title: 'Forgery-Proof Credentials',
    description: 'Degrees are minted as ERC-1155 tokens on Monad. Once on-chain, they cannot be faked, altered, or unjustly revoked.',
  },
  {
    icon: Bot,
    title: 'AI Agent Ready',
    description: 'Our x402 protocol allows AI hiring agents to autonomously verify a candidate\'s degree by paying a micro-fee in MON.',
  },
  {
    icon: Coins,
    title: 'Student Monetization',
    description: 'Students earn 80% of the verification fee every time an employer checks their credential. Turn your degree into an asset.',
  },
];

const stats = [
  { label: 'Credentials Minted', value: '12.4k' },
  { label: 'Active Institutions', value: '142' },
  { label: 'Verification Volume', value: '$2.1M' },
];

export default function Index() {
  const { isConnected, isConnecting, connect } = useWallet();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* --- HERO SECTION --- */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 animated-gradient-bg opacity-40" />
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px]" />

        <div className="container mx-auto px-6 pt-24 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-xs font-medium text-muted-foreground">Live on Monad Testnet</span>
              </div>

              <h1 className="text-5xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                Degrees that <br />
                <span className="text-gradient hover:scale-105 transition-transform inline-block cursor-default">Pay You Back.</span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
                The first decentralized credential network where students own their data and earn from every background check.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                {isConnected ? (
                  <Link to="/vault">
                    <Button variant="hero" size="xl" className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
                      Go to Vault
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={connect}
                    disabled={isConnecting}
                    className="gap-2 shadow-lg shadow-primary/20"
                  >
                    <Wallet className="h-5 w-5" />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                )}

                <Link to="/issuer">
                  <Button variant="outline" size="xl" className="group">
                    For Universities
                    <Building2 className="ml-2 h-4 w-4 group-hover:text-primary transition-colors" />
                  </Button>
                </Link>
              </div>

              {/* Mini Trust Signals */}
              <div className="pt-8 border-t border-border/50 flex gap-8">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Graphic - Interactive Diagram */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="card-protocol p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                  <AnimatedLogo className="h-16 w-16 text-white/10" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-lg font-semibold mb-6">Autonomous Verification Flow</h3>
                  <FlowDiagram />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* --- ABOUT US / MISSION SECTION --- */}
      <section className="py-32 bg-secondary/5 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Why EduTrust?</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Academic fraud is a billion-dollar industry. Fake degrees undermine trust in institutions and devalue real achievements.
              We built EduTrust to replace paper certificates with <strong>crypto-graphically secure assets</strong>.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-protocol p-8 hover:bg-secondary/40 transition-colors group"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (Steps) --- */}
      <section className="py-32">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold mb-16 text-center">Protocol Architecture</h2>

          <div className="relative border-l-2 border-border/50 ml-4 md:ml-auto md:mx-auto max-w-3xl pl-8 md:pl-0 space-y-16">
            {[
              { title: "Minting", text: "Universities issue credentials as specialized NFTs using their exclusive DID keys. Students receive the token directly in their wallet." },
              { title: "Verification", text: "Employers or AI Agents scan the wallet address. They request verification via the x402 header payment standard." },
              { title: "Settlement", text: "The Smart Contract unlocks the verified data only after payment. 80% of the funds are routed instantly to the Student." }
            ].map((step, i) => (
              <div key={i} className="relative md:grid md:grid-cols-5 md:gap-8 items-center">
                <div className="absolute -left-[41px] md:relative md:left-0 md:col-span-1 md:text-right">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-4 ring-background">
                    {i + 1}
                  </span>
                </div>
                <div className="md:col-span-4">
                  <h3 className="text-2xl font-bold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CTA FOOTER --- */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-80" />
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl font-bold mb-8">Join the Trust Network</h2>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/issuer">
              <Button size="xl" className="bg-white text-black hover:bg-white/90 w-full sm:w-auto">
                Register as Issuer
              </Button>
            </Link>
            <Link to="/vault">
              <Button size="xl" variant="outline" className="border-white/20 text-white hover:bg-white/10 w-full sm:w-auto">
                Claim Student Vault
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-12 bg-black/40 backdrop-blur-md">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <AnimatedLogo className="h-8 w-8" />
            <span className="font-bold text-xl tracking-tight">EduTrust</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2024 EduTrust Protocol. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-sm text-muted-foreground">Systems Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
