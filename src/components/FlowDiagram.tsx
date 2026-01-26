import { motion } from 'framer-motion';
import { GraduationCap, Shield, Bot, Coins, CheckCircle } from 'lucide-react';

const steps = [
  { icon: GraduationCap, label: 'Issuer', sublabel: 'Mints ERC-1155' },
  { icon: Shield, label: 'Student Vault', sublabel: 'Stores Credential' },
  { icon: Bot, label: 'Hiring Agent', sublabel: 'Requests Access' },
  { icon: Coins, label: '$MON Payment', sublabel: 'x402 Settlement' },
  { icon: CheckCircle, label: 'Access Granted', sublabel: 'IPFS Data Released' },
];

export function FlowDiagram() {
  return (
    <div className="relative w-full py-8">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-glow opacity-30" />
      
      <div className="relative flex flex-col gap-4">
        {steps.map((step, index) => (
          <motion.div
            key={step.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.15, duration: 0.5 }}
            className="flex items-center gap-4"
          >
            {/* Step Node */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.15 + 0.2, type: 'spring', stiffness: 200 }}
              className="relative flex-shrink-0"
            >
              <div className="h-12 w-12 rounded-xl bg-secondary border border-border flex items-center justify-center group-hover:border-primary/50 transition-colors">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              {/* Pulse Effect */}
              {index === steps.length - 1 && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-xl bg-success/30"
                />
              )}
            </motion.div>

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{step.label}</p>
              <p className="text-xs text-muted-foreground">{step.sublabel}</p>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: index * 0.15 + 0.3, duration: 0.3 }}
                className="absolute left-6 w-px bg-gradient-to-b from-border to-primary/30 origin-top"
                style={{
                  top: `${(index + 1) * 64 + 8}px`,
                  height: '40px',
                }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Animated Data Flow */}
      <motion.div
        initial={{ top: '0%', opacity: 0 }}
        animate={{ 
          top: ['0%', '100%'],
          opacity: [0, 1, 1, 0]
        }}
        transition={{ 
          duration: 3,
          repeat: Infinity,
          repeatDelay: 1,
          ease: 'easeInOut'
        }}
        className="absolute left-6 w-2 h-2 rounded-full bg-primary shadow-glow"
        style={{ transform: 'translateX(-50%)' }}
      />
    </div>
  );
}
