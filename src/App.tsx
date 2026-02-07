
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import Index from "./pages/Index";

import RoleSelection from "./pages/RoleSelection";
import IssuerDashboard from "./pages/IssuerDashboard";
import IssuerLogin from "./pages/IssuerLogin";
import StudentVault from "./pages/StudentVault";
import VerificationPage from "./pages/VerificationPage";
import BulkVerificationPage from "./pages/BulkVerificationPage";
import NotesMarketplace from "./pages/NotesMarketplace";
import MintNote from "./pages/MintNote";
import MyNotes from "./pages/MyNotes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle role-based routing protection
const ProtectedRoute = ({
  children,
  allowedRole
}: {
  children: React.ReactNode,
  allowedRole?: 'student' | 'issuer' | 'verifier'
}) => {
  const { role, isIssuerVerified } = useRole();
  const location = useLocation();

  if (!role) {
    // Instead of redirecting to Home, we might want to send them to /roles or handle it gracefully.
    // For now, redirecting to /roles is safer if they tried to access a protected route without a role.
    return <Navigate to="/roles" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  // Specific check for Issuer verification
  if (role === 'issuer' && !isIssuerVerified && location.pathname === '/issuer') {
    return <IssuerLogin />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  // We remove the auto-redirect logic so everyone sees the beautiful landing page first
  return (
    <>
      {/* Header is inside the pages now to handle transparency better, or kept global */}
      {/* <Header /> Removing global header to let Index manage its own if needed, but Index uses Header so keeping it global is fine, 
                ACTUALLY Index has <Header /> inside it. To avoid double header, let's remove it here or check Index. 
                Index.tsx HAS <Header />. 
                IssuerDashboard HAS <Header />.
                So we should REMOVE global <Header /> here.
            */}

      <Routes>
        <Route path="/" element={<Index />} />

        <Route path="/roles" element={<RoleSelection />} />

        {/* Marketplace Routes - Public Access */}
        <Route path="/marketplace" element={<NotesMarketplace />} />
        <Route path="/mint-note" element={<MintNote />} />
        <Route path="/my-notes" element={<MyNotes />} />

        <Route path="/vault" element={
          <ProtectedRoute allowedRole="student">
            <StudentVault />
          </ProtectedRoute>
        } />

        <Route path="/issuer" element={
          <ProtectedRoute allowedRole="issuer">
            <IssuerDashboard />
          </ProtectedRoute>
        } />

        <Route path="/verify" element={
          <ProtectedRoute allowedRole="verifier">
            <VerificationPage />
          </ProtectedRoute>
        } />

        <Route path="/bulk-verify" element={
          <ProtectedRoute allowedRole="verifier">
            <BulkVerificationPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <RoleProvider>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </RoleProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
