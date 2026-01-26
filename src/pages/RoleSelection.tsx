
import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Building2, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';

const roles = [
  {
    id: 'student',
    title: 'Student',
    icon: GraduationCap,
    description: 'Manage your credentials, access your vault, and share verifications.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    id: 'issuer',
    title: 'Issuer',
    icon: Building2,
    description: 'Issue tamper-proof credentials to students and manage institution records.',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
  },
  {
    id: 'verifier',
    title: 'Verifier',
    icon: ShieldCheck,
    description: 'Verify credentials instantly and trustlessly using the blockchain.',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
] as const;

export default function RoleSelection() {
  const { selectRole } = useRole();
  const navigate = useNavigate();

  const handleRoleSelect = (roleId: 'student' | 'issuer' | 'verifier') => {
    selectRole(roleId);
    if (roleId === 'student') navigate('/vault');
    if (roleId === 'issuer') navigate('/issuer'); // Will be intercepted by IssuerLogin check
    if (roleId === 'verifier') navigate('/verify');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 animated-gradient-bg" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        <div className="z-10 text-center max-w-2xl mx-auto mb-16 space-y-4">
            <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold tracking-tight"
            >
                Choose Your Role
            </motion.h1>
            <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-muted-foreground text-lg"
            >
                Select how you want to interact with the EduTrust platform.
            </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl w-full z-10">
            {roles.map((role, index) => (
                <motion.div
                    key={role.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    className={`relative group cursor-pointer rounded-2xl border ${role.border} bg-card/50 backdrop-blur-sm p-8 transition-all hover:border-opacity-100 hover:shadow-lg`}
                    onClick={() => handleRoleSelect(role.id)}
                >
                    <div className={`h-12 w-12 rounded-lg ${role.bg} flex items-center justify-center mb-6`}>
                        <role.icon className={`h-6 w-6 ${role.color}`} />
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-3">{role.title}</h3>
                    <p className="text-muted-foreground mb-6 h-12">
                        {role.description}
                    </p>
                    
                    <div className="flex items-center text-sm font-medium text-foreground group-hover:translate-x-1 transition-transform">
                        Get Started <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                </motion.div>
            ))}
        </div>
    </div>
  );
}
