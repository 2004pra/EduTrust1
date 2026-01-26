
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Mail, Lock, ArrowRight, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRole } from '@/contexts/RoleContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function IssuerLogin() {
    const { verifyIssuer } = useRole();
    const navigate = useNavigate();

    const [step, setStep] = useState<'register' | 'otp'>('register');
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        collegeName: '',
        email: ''
    });
    const [otp, setOtp] = useState('');

    // Valid domains for simulation - in real app this would be backend validation
    const validDomains = ['edu.in', 'ac.in', 'university.com']; // removed gmail for demo

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Validation logic
        const emailDomain = formData.email.split('@')[1];
        const isValidDomain = validDomains.some(domain => emailDomain?.endsWith(domain));
        const isDemoEmail = formData.email === 'prashant37364@gmail.com';

        if (!isValidDomain && !isDemoEmail) {
            toast.error('Invalid Institution Email', {
                description: 'Please use a valid educational institution email address.'
            });
            setLoading(false);
            return;
        }

        // Success - move to OTP
        if (isDemoEmail) {
            toast.success('OTP Sent', {
                description: `Demo OTP: 123456 sent to ${formData.email}`
            });
        } else {
            toast.success('OTP Sent', {
                description: `We've sent a verification code to ${formData.email}`
            });
        }

        setStep('otp');
        setLoading(false);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Mock OTP check
        // For demo email, we expect 123456. For others, any 6 digit works for simulation.
        const isDemoEmail = formData.email === 'prashant37364@gmail.com';
        const isValidOtp = isDemoEmail ? otp === '123456' : otp.length === 6;

        if (isValidOtp) {
            verifyIssuer();
            localStorage.setItem('issuerName', formData.collegeName); // Store college name
            toast.success('Verification Successful', {
                description: 'Welcome to the Issuer Dashboard.'
            });
            navigate('/issuer');
        } else {
            toast.error('Invalid OTP', {
                description: isDemoEmail ? 'For demo email, use OTP: 123456' : 'Please enter a valid 6-digit code.'
            });
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute inset-0 animated-gradient-bg" />
            <div className="absolute inset-0 grid-pattern opacity-30" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-xl relative z-10"
            >
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Issuer Portal</h2>
                        <p className="text-sm text-muted-foreground">Institution Verification</p>
                    </div>
                </div>

                {step === 'register' ? (
                    <form onSubmit={handleRegister} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="collegeName">Institution Name</Label>
                            <Input
                                id="collegeName"
                                placeholder="e.g. Indian Institute of Technology"
                                required
                                value={formData.collegeName}
                                onChange={(e) => setFormData({ ...formData, collegeName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Official Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="registrar@college.edu.in"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground">
                                Must be a valid educational domain (.edu, .ac.in, etc.)
                            </p>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Mail className="h-4 w-4 mr-2" />
                            )}
                            Send Verification Code
                        </Button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="space-y-6">
                        <div className="text-center mb-6">
                            <div className="bg-green-500/10 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="h-8 w-8 text-green-500" />
                            </div>
                            <h3 className="text-lg font-semibold">Check your inbox</h3>
                            <p className="text-sm text-muted-foreground">
                                We sent a code to <span className="text-foreground font-medium">{formData.email}</span>
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="otp">Verification Code</Label>
                            <Input
                                id="otp"
                                placeholder="000000"
                                className="text-center text-2xl tracking-widest"
                                maxLength={6}
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Verify & Login
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full"
                            onClick={() => setStep('register')}
                            disabled={loading}
                        >
                            Change Email
                        </Button>
                    </form>
                )}
            </motion.div>
        </div>
    );
}
