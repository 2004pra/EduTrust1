import React from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, AlertTriangle, CheckCircle, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useRole } from '@/contexts/RoleContext';

export function Header() {
  const {
    address,
    isConnected,
    isCorrectNetwork,
    connect,
    disconnect,
    switchToMonad,
  } = useWallet();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { role, logout } = useRole();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    disconnect();
    navigate('/');
  };

  const getNavLinks = () => {
    // Marketplace link is always visible
    const commonLinks = [{ path: '/marketplace', label: 'Marketplace' }];

    switch (role) {
      case 'student':
        return [...commonLinks, { path: '/vault', label: 'My Vault' }];
      case 'issuer':
        return [...commonLinks, { path: '/issuer', label: 'Issuer Dashboard' }];
      case 'verifier':
        return [...commonLinks, { path: '/verify', label: 'Verification Portal' }];
      default:
        return commonLinks;
    }
  };

  const navLinks = getNavLinks();

  if (!role) return null; // Don't show header on Role Selection screen if that's preferred, or show minimal header.
  // Actually, let's show the header but with no nav links if no role is selected, or maybe just the logo.
  // But wait, if I return null, the RoleSelection page needs to handle its own layout or be fine without header.
  // The RoleSelection page design I made seems standalone. Let's verify.
  // Yes, RoleSelection has absolute background effects but no header included.
  // If I return null here, it won't show on RoleSelection. That's probably fine as RoleSelection looks like a landing page.
  // However, I should double check if I want the header there.
  // Let's stick to showing the Header only when a role is selected, or keep it minimal.
  // The user requirement says "only have access to vault, logout only".

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary" />
              <div className="absolute inset-0 h-8 w-8 rounded-lg bg-gradient-primary blur-lg opacity-50" />
            </div>
            <span className="text-xl font-bold tracking-tight">EduTrust</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === link.path
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wallet Connection & Theme Toggle */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {isConnected ? (
              <>
                {/* Network Badge */}
                {isCorrectNetwork ? (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success/10 border border-success/20">
                    <CheckCircle className="h-3.5 w-3.5 text-success" />
                    <span className="text-xs font-medium text-success">Monad</span>
                  </div>
                ) : (
                  <Button
                    variant="protocol"
                    size="sm"
                    onClick={switchToMonad}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Switch</span>
                  </Button>
                )}

                {/* Wallet Address - Simplified */}
                <div className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-mono">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button onClick={connect} className="gap-2">
                <Wallet className="h-4 w-4" />
                <span>Connect</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}

