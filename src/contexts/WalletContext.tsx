import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

// Monad Testnet configuration
const MONAD_TESTNET = {
  chainId: '0x279F', // 10143 in hex
  chainIdDecimal: 10143,
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet.monadexplorer.com'],
};

interface WalletContextType {
  address: string | null;
  balance: string;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToMonad: () => Promise<void>;
  formatAddress: (addr: string) => string;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const getErrorMessage = (err: unknown) => {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
};

const getErrorCode = (err: unknown) => {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'number') return code;
    if (typeof code === 'string' && code.trim() !== '') return Number(code);
  }
  return undefined;
};

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [isConnected, setIsConnected] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('edutrust-wallet-manual-disconnect') === '1';
  });

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const checkNetwork = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') return false;
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrect = chainId === MONAD_TESTNET.chainId;
      setIsCorrectNetwork(isCorrect);
      return isCorrect;
    } catch (err) {
      console.error('Failed to check network:', err);
      setIsCorrectNetwork(false);
      return false;
    }
  }, []);

  const fetchBalance = useCallback(async (addr: string) => {
    if (typeof window.ethereum === 'undefined') return;
    try {
      // Ethers v6 adaptation
      const provider = new ethers.BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(addr);
      setBalance(ethers.formatEther(bal));
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      setBalance('0');
    }
  }, []);

  const switchToMonad = useCallback(async () => {
    if (typeof window.ethereum === 'undefined') {
      const msg = 'MetaMask is not installed';
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET.chainId }],
      });
      setIsCorrectNetwork(true);
    } catch (switchError: unknown) {
      if (getErrorCode(switchError) === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: MONAD_TESTNET.chainId,
                chainName: MONAD_TESTNET.chainName,
                nativeCurrency: MONAD_TESTNET.nativeCurrency,
                rpcUrls: MONAD_TESTNET.rpcUrls,
                blockExplorerUrls: MONAD_TESTNET.blockExplorerUrls,
              },
            ],
          });
          setIsCorrectNetwork(true);
        } catch (addError: unknown) {
          const msg = 'Failed to add Monad Testnet to MetaMask';
          setError(msg);
          toast.error(msg);
        }
      } else {
        const msg = 'Failed to switch to Monad Testnet';
        setError(msg);
        toast.error(msg);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window.ethereum === 'undefined' || !window.ethereum.request) {
      const msg = 'MetaMask is not installed. Please install MetaMask to continue.';
      setError(msg);
      toast.error(msg, {
        description: 'You can download it from metamask.io',
        action: {
          label: 'Get MetaMask',
          onClick: () => window.open('https://metamask.io/download/', '_blank'),
        },
      });
      return;
    }

    setIsConnecting(true);
    setError(null);
    setIsManuallyDisconnected(false);
    localStorage.setItem('edutrust-wallet-manual-disconnect', '0');

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setIsConnected(true);
        await checkNetwork();
        await fetchBalance(accounts[0]);
        toast.success('Wallet connected successfully!');
      }
    } catch (err: unknown) {
      let msg = 'Failed to connect to MetaMask';
      const code = getErrorCode(err);
      const message = getErrorMessage(err);

      if (code === 4001) {
        msg = 'Connection rejected by user';
      } else if (code === -32002) {
        msg = 'Connection request already pending. Please check MetaMask.';
      } else if (message.includes('extension not found')) {
        msg = 'MetaMask extension not found or not responding';
      }
      
      setError(msg);
      toast.error(msg);
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetwork, fetchBalance]);

  const disconnect = useCallback(() => {
    setIsManuallyDisconnected(true);
    localStorage.setItem('edutrust-wallet-manual-disconnect', '1');
    setAddress(null);
    setBalance('0');
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setError(null);
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    let mounted = true;
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (!isManuallyDisconnected) {
        setAddress(accounts[0]);
        fetchBalance(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      checkNetwork();
      if (address) {
        fetchBalance(address);
      }
    };

    const initWallet = async () => {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!mounted) return;
      if (typeof window.ethereum === 'undefined' || !window.ethereum.request) return;

      try {
        if (window.ethereum.on) {
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          window.ethereum.on('chainChanged', handleChainChanged);
        }

        if (!isManuallyDisconnected) {
          try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (mounted && accounts && accounts.length > 0) {
              setAddress(accounts[0]);
              setIsConnected(true);
              await checkNetwork();
              await fetchBalance(accounts[0]);
            }
          } catch (err) {
            void err;
          }
        }
      } catch (err) {
        void err;
      }
    };

    initWallet();

    return () => {
      mounted = false;
      if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address, checkNetwork, disconnect, fetchBalance, isManuallyDisconnected]);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnected,
        isCorrectNetwork,
        isConnecting,
        error,
        connect,
        disconnect,
        switchToMonad,
        formatAddress,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
