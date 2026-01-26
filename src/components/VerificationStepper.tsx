import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Search, AlertCircle, Wallet, RefreshCw, CheckCircle2 } from 'lucide-react';

type VerificationStep = 'request' | '402' | 'pay' | 'retry' | 'verified';

interface VerificationStepperProps extends React.HTMLAttributes<HTMLDivElement> {
  currentStep: VerificationStep;
}

const steps: { id: VerificationStep; label: string; icon: React.ElementType }[] = [
  { id: 'request', label: 'Request', icon: Search },
  { id: '402', label: '402 Required', icon: AlertCircle },
  { id: 'pay', label: 'Pay', icon: Wallet },
  { id: 'retry', label: 'Retry', icon: RefreshCw },
  { id: 'verified', label: 'Verified', icon: CheckCircle2 },
];

export const VerificationStepper = forwardRef<HTMLDivElement, VerificationStepperProps>(
  ({ currentStep, className, ...props }, ref) => {
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div ref={ref} className={`w-full ${className || ''}`} {...props}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex-1 flex items-center">
                {/* Step Circle */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isCompleted
                      ? 'hsl(var(--success))'
                      : isActive
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--secondary))',
                  }}
                  className="relative flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isCompleted
                      ? 'hsl(var(--success))'
                      : isActive
                      ? 'hsl(var(--primary))'
                      : 'hsl(var(--border))',
                  }}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isCompleted || isActive ? 'text-white' : 'text-muted-foreground'
                    }`}
                  />
                  {isActive && (
                    <motion.div
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-primary"
                    />
                  )}
                </motion.div>

                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 mx-2">
                    <motion.div
                      initial={false}
                      animate={{
                        scaleX: isCompleted ? 1 : 0,
                        backgroundColor: isCompleted
                          ? 'hsl(var(--success))'
                          : 'hsl(var(--border))',
                      }}
                      className="h-full origin-left bg-border"
                      style={{ backgroundColor: isCompleted ? 'hsl(var(--success))' : undefined }}
                    />
                    <div
                      className="h-full bg-border -mt-0.5"
                      style={{ opacity: isCompleted ? 0 : 1 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Labels */}
        <div className="flex items-center justify-between mt-3">
          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={step.id} className="flex-1 text-center first:text-left last:text-right">
                <span
                  className={`text-xs font-medium ${
                    isActive
                      ? 'text-primary'
                      : isCompleted
                      ? 'text-success'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VerificationStepper.displayName = 'VerificationStepper';
