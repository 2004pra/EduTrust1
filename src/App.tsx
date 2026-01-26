
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { WalletProvider } from "@/contexts/WalletContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { RoleProvider, useRole } from "@/contexts/RoleContext";
import RoleSelection from "./pages/RoleSelection";
import IssuerDashboard from "./pages/IssuerDashboard";
import IssuerLogin from "./pages/IssuerLogin";
import StudentVault from "./pages/StudentVault";
import VerificationPage from "./pages/VerificationPage";
import NotFound from "./pages/NotFound";
import { Header } from "@/components/Header";

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
    return <Navigate to="/" replace />;
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
    const { role } = useRole();

    return (
        <>
            <Header />
            <Routes>
                <Route path="/" element={
                    role ? (
                        role === 'student' ? <Navigate to="/vault" replace /> :
                        role === 'issuer' ? <Navigate to="/issuer" replace /> :
                        role === 'verifier' ? <Navigate to="/verify" replace /> :
                        <RoleSelection />
                    ) : (
                        <RoleSelection />
                    )
                } />
                
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
