
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

type Role = 'student' | 'issuer' | 'verifier' | null;

interface RoleContextType {
  role: Role;
  selectRole: (role: Role) => void;
  isIssuerVerified: boolean;
  verifyIssuer: () => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(() => {
    // Persist role in localStorage to survive refreshes
    return (localStorage.getItem('userRole') as Role) || null;
  });
  const [isIssuerVerified, setIsIssuerVerified] = useState<boolean>(() => {
    return localStorage.getItem('isIssuerVerified') === 'true';
  });

  const selectRole = (newRole: Role) => {
    setRole(newRole);
    if (newRole) {
      localStorage.setItem('userRole', newRole);
    } else {
      localStorage.removeItem('userRole');
    }
    
    // Reset verification when switching roles, unless it's the same role
    if (newRole !== 'issuer') {
      setIsIssuerVerified(false);
      localStorage.removeItem('isIssuerVerified');
    }
  };

  const verifyIssuer = () => {
    setIsIssuerVerified(true);
    localStorage.setItem('isIssuerVerified', 'true');
  };

  const logout = () => {
    setRole(null);
    setIsIssuerVerified(false);
    localStorage.removeItem('userRole');
    localStorage.removeItem('isIssuerVerified');
    // Disconnect wallet logic might be handled separately or here if we access WalletContext
    // But typically wallet connection is independent of app role, though the requirement says "logout only" for student.
    // We'll handle wallet disconnect trigger in the UI components if needed.
  };

  return (
    <RoleContext.Provider value={{ role, selectRole, isIssuerVerified, verifyIssuer, logout }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
