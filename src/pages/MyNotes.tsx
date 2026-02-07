import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { Link } from 'react-router-dom';
import {
    BookOpen, Plus, DollarSign, TrendingUp, ShoppingCart,
    Wallet, Loader2, Download, Eye, Trash2,
    ArrowLeft, Package,
    Tag
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    getCreatorNotes,
    getNoteMetadata,
    getListing,
    getUserEarnings,
    withdrawEarnings,
    delistNote,
    NoteMetadata,
    MARKETPLACE_ADDRESSES,
    MARKETPLACE_CONFIG
} from '@/services/MarketplaceService';
import {
    getUserTransactions,
    getNoteByTokenId,
    DbNote
} from '@/services/SupabaseService';
import { getIpfsUrl } from '@/services/IpfsService';

interface CreatedNote extends NoteMetadata {
    status: 'listed' | 'unlisted' | 'sold';
    price?: string;
    listingId?: number;
    sales: number;
    earnings: string;
}

interface PurchasedNote extends DbNote {
    purchasePrice: string;
    purchasedAt: string;
}

interface SaleRecord {
    tokenId: number;
    title: string;
    buyer: string;
    price: string;
    yourEarnings: string;
    soldAt: string;
}

export default function MyNotes() {
    const { isConnected, address, connect } = useWallet();
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'created' | 'purchased' | 'sales'>('created');
    const [createdNotes, setCreatedNotes] = useState<CreatedNote[]>([]);
    const [purchasedNotes, setPurchasedNotes] = useState<PurchasedNote[]>([]);
    const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
    const [pendingBalance, setPendingBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    const minWithdraw = MARKETPLACE_CONFIG.minWithdrawal;
    const canWithdraw = pendingBalance >= minWithdraw;

    useEffect(() => {
        if (isConnected && address) {
            fetchData();
        }
    }, [isConnected, address]);

    const fetchData = async () => {
        if (!address) return;
        setIsLoading(true);
        try {
            // 1. Fetch Earnings
            try {
                const earningsWei = await getUserEarnings(address);
                setPendingBalance(parseFloat(earningsWei));
            } catch (e) {
                console.error("Error fetching earnings:", e);
                setPendingBalance(0);
            }

            // 2. Fetch Created Notes & Status
            try {
                // Get all token IDs created by user from blockchain
                const createdTokenIds = await getCreatorNotes(address);

                const notesPromises = createdTokenIds.map(async (tokenId) => {
                    try {
                        const metadata = await getNoteMetadata(tokenId);

                        // Default to unlisted/in-wallet
                        let status: 'listed' | 'unlisted' | 'sold' = 'unlisted';
                        let price = undefined;
                        let listing = null;

                        try {
                            listing = await getListing(tokenId);
                            if (listing && listing.isActive) {
                                status = 'listed';
                                price = listing.price;
                            }
                        } catch (e) {
                            // Ignore if listing not found
                        }

                        // Use case-insensitive comparison for addresses
                        const isOwner = metadata.currentOwner.toLowerCase() === address.toLowerCase();
                        const isMarketplace = metadata.currentOwner.toLowerCase() === MARKETPLACE_ADDRESSES.NotesMarketplace.toLowerCase();

                        if (!isOwner && !isMarketplace) {
                            // If I don't own it and it's not in marketplace, I sold/transferred it
                            status = 'sold';
                        } else if (isMarketplace && (!listing || listing.seller.toLowerCase() !== address.toLowerCase())) {
                            // Valid edge case: It's in marketplace but someone else is selling it? (Resale)
                            // If I created it, but someone else is selling it, for me it's "sold".
                            status = 'sold';
                        }

                        return {
                            ...metadata,
                            status,
                            price,
                            sales: status === 'sold' ? 1 : 0,
                            earnings: listing && status === 'sold' ? (parseFloat(listing.price) * 0.9).toFixed(2) : '0'
                        } as CreatedNote;
                    } catch (e) {
                        console.error(`Error fetching note ${tokenId}:`, e);
                        return null;
                    }
                });

                const resolvedNotes = (await Promise.all(notesPromises)).filter((n): n is CreatedNote => n !== null);
                setCreatedNotes(resolvedNotes.sort((a, b) => b.createdAt - a.createdAt));
            } catch (e) {
                console.error("Error fetching created notes:", e);
            }


            // 3. Fetch Transactions (Purchases & Sales)
            try {
                const txs = await getUserTransactions(address);

                // Filter Purchases
                const buyTxs = txs.filter(tx => tx.tx_type === 'buy' && tx.from_address.toLowerCase() === address.toLowerCase());
                const purchasedPromises = buyTxs.map(async (tx) => {
                    const note = await getNoteByTokenId(tx.token_id);
                    if (!note) return null;
                    return {
                        ...note,
                        purchasePrice: tx.price_mon?.toString() || '0',
                        purchasedAt: tx.created_at
                    } as PurchasedNote;
                });
                const resolvedPurchased = (await Promise.all(purchasedPromises)).filter((n): n is PurchasedNote => n !== null);
                setPurchasedNotes(resolvedPurchased);

                // Filter Sales
                // Assuming if 'buy' and I am NOT sender, I am likely seller. 
                // Or verify using 'to_address' if available. Use loose check for now.
                const saleTxs = txs.filter(tx => tx.tx_type === 'buy' && tx.from_address.toLowerCase() !== address.toLowerCase());

                const salesData = await Promise.all(saleTxs.map(async (tx) => {
                    const note = await getNoteByTokenId(tx.token_id);
                    return {
                        tokenId: tx.token_id,
                        title: note?.title || `Note #${tx.token_id}`,
                        buyer: tx.from_address,
                        price: tx.price_mon?.toString() || '0',
                        yourEarnings: ((tx.price_mon || 0) * 0.9).toFixed(2), // Approx 90%
                        soldAt: tx.created_at
                    };
                }));
                // Filter salesData to only include items where I was actually the seller (need to check listing or note creator history?)
                // For MVP, if Supabase 'to_address' is seller, use that.
                // Assuming getUserTransactions returns relevant txs.
                setSalesHistory(salesData);
            } catch (e) {
                console.error("Error fetching transactions:", e);
            }

        } catch (error) {
            console.error("Error fetching data:", error);
            toast({
                title: "Error loading data",
                description: "Could not fetch your notes and earnings.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!canWithdraw) {
            toast({
                title: "Insufficient Balance",
                description: `Minimum withdrawal is ${minWithdraw} MON. Current balance: ${pendingBalance} MON`,
                variant: "destructive"
            });
            return;
        }

        setWithdrawing(true);
        try {
            const txHash = await withdrawEarnings();
            toast({
                title: "Withdrawal Successful! 💰",
                description: `Earnings sent to your wallet.`,
            });
            // Refresh balance
            const newBalance = await getUserEarnings(address!);
            setPendingBalance(parseFloat(newBalance));
        } catch (error) {
            console.error("Withdraw error:", error);
            toast({
                title: "Withdrawal Failed",
                description: "Transaction failed. Please try again.",
                variant: "destructive"
            });
        } finally {
            setWithdrawing(false);
        }
    };

    const handleDelist = async (tokenId: number) => {
        try {
            const txHash = await delistNote(tokenId);

            toast({
                title: "Note Delisted",
                description: "Your note has been removed from the marketplace",
            });

            // Refresh data
            fetchData();
        } catch (error) {
            console.error("Delist error:", error);
            toast({
                title: "Delist Failed",
                description: "Could not delist note. Please try again.",
                variant: "destructive"
            });
        }
    };

    const totalEarnings = salesHistory.reduce((sum, sale) => sum + parseFloat(sale.yourEarnings), 0);
    const totalSales = salesHistory.length;

    if (!isConnected) {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container mx-auto px-6 pt-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto text-center"
                    >
                        <div className="card-protocol p-8">
                            <Wallet className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                            <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
                            <p className="text-muted-foreground mb-6">
                                Connect your wallet to view and manage your notes.
                            </p>
                            <Button
                                onClick={connect}
                                className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600"
                            >
                                <Wallet className="h-4 w-4" />
                                Connect Wallet
                            </Button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Hero */}
            <section className="relative pt-32 pb-8 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
                <div className="container mx-auto px-6 relative z-10">
                    <Link to="/marketplace" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Marketplace
                    </Link>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row justify-between gap-6"
                    >
                        <div>
                            <h1 className="text-4xl font-bold mb-2">
                                My <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Notes</span>
                            </h1>
                            <p className="text-muted-foreground">
                                Manage your minted notes, purchases, and earnings
                            </p>
                        </div>
                        <Link to="/mint-note">
                            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                                <Plus className="h-4 w-4" />
                                Mint New Notes
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* Stats Cards */}
            <section className="container mx-auto px-6 pb-8">
                <div className="grid md:grid-cols-4 gap-4">
                    {[
                        {
                            label: "Total Earnings",
                            value: `${totalEarnings.toFixed(1)} MON`,
                            icon: TrendingUp,
                            color: "green"
                        },
                        {
                            label: "Total Sales",
                            value: totalSales.toString(),
                            icon: ShoppingCart,
                            color: "blue"
                        },
                        {
                            label: "Notes Created",
                            value: createdNotes.length.toString(),
                            icon: BookOpen,
                            color: "purple"
                        },
                        {
                            label: "Notes Purchased",
                            value: purchasedNotes.length.toString(),
                            icon: Package,
                            color: "pink"
                        }
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="card-protocol p-6"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <stat.icon className={`h-5 w-5 text-${stat.color}-400`} />
                            </div>
                            <p className="text-2xl font-bold font-mono">{stat.value}</p>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Withdrawal Card */}
            <section className="container mx-auto px-6 pb-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card-protocol p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-500/20"
                >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-green-400" />
                                Pending Balance
                            </h3>
                            <p className="text-3xl font-bold font-mono text-green-400">
                                {pendingBalance.toFixed(1)} MON
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Minimum withdrawal: {minWithdraw} MON
                            </p>
                        </div>
                        <Button
                            onClick={handleWithdraw}
                            disabled={!canWithdraw || withdrawing}
                            className={`gap-2 ${canWithdraw ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600'}`}
                        >
                            {withdrawing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Withdrawing...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Withdraw Earnings
                                </>
                            )}
                        </Button>
                    </div>
                </motion.div>
            </section>

            {/* Tabs */}
            <section className="container mx-auto px-6 pb-4">
                <div className="flex gap-2 border-b border-white/10">
                    {[
                        { id: 'created', label: 'Created Notes', count: createdNotes.length },
                        { id: 'purchased', label: 'Purchased', count: purchasedNotes.length },
                        { id: 'sales', label: 'Sales History', count: salesHistory.length }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-purple-500 text-purple-400'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>
            </section>

            {/* Content */}
            <section className="container mx-auto px-6 pb-20">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                    </div>
                ) : (
                    <>
                        {/* Created Notes Tab */}
                        {activeTab === 'created' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {createdNotes.length === 0 ? (
                                    <div className="text-center py-16">
                                        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-xl font-bold mb-2">No Notes Created Yet</h3>
                                        <p className="text-muted-foreground mb-6">
                                            Mint your first notes and start earning!
                                        </p>
                                        <Link to="/mint-note">
                                            <Button className="gap-2">
                                                <Plus className="h-4 w-4" />
                                                Mint Notes
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {createdNotes.map((note, i) => (
                                            <motion.div
                                                key={note.tokenId}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="card-protocol p-6"
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                                                        <BookOpen className="h-6 w-6 text-purple-400" />
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${note.status === 'listed'
                                                        ? 'bg-green-500/20 text-green-400'
                                                        : note.status === 'sold'
                                                            ? 'bg-blue-500/20 text-blue-400'
                                                            : 'bg-gray-500/20 text-gray-400'
                                                        }`}>
                                                        {note.status === 'listed' ? 'Listed' : note.status === 'sold' ? 'Sold' : 'Unlisted'}
                                                    </span>
                                                </div>

                                                <h3 className="font-bold mb-1 line-clamp-1">{note.title}</h3>
                                                <p className="text-sm text-muted-foreground mb-4">{note.subject}</p>

                                                <div className="grid grid-cols-2 gap-2 mb-4">
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Price</p>
                                                        <p className="font-bold font-mono">{note.price ? `${note.price} MON` : '-'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground">Status</p>
                                                        <p className="font-bold capitalize">{note.status}</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {note.status === 'listed' && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelist(note.tokenId)}
                                                            className="flex-1 text-red-400 border-red-500/30 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" />
                                                            Delist
                                                        </Button>
                                                    )}
                                                    {note.status === 'unlisted' && (
                                                        <Link to={`/marketplace`} className="flex-1">
                                                            <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                                                                <DollarSign className="h-3 w-3" />
                                                                List for Sale
                                                            </Button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Purchased Notes Tab */}
                        {activeTab === 'purchased' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {purchasedNotes.length === 0 ? (
                                    <div className="text-center py-16">
                                        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-xl font-bold mb-2">No Purchases Yet</h3>
                                        <p className="text-muted-foreground mb-6">
                                            Browse the marketplace to find great notes!
                                        </p>
                                        <Link to="/marketplace">
                                            <Button className="gap-2">
                                                <BookOpen className="h-4 w-4" />
                                                Browse Marketplace
                                            </Button>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {purchasedNotes.map((note, i) => (
                                            <motion.div
                                                key={note.token_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                className="card-protocol p-6"
                                            >
                                                <div className="h-24 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4 flex items-center justify-center overflow-hidden relative">
                                                    {note.preview_hash ? (
                                                        <img src={getIpfsUrl(note.preview_hash)} alt={note.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <BookOpen className="h-10 w-10 text-purple-400/50" />
                                                    )}
                                                </div>

                                                <h3 className="font-bold mb-1 line-clamp-1">{note.title}</h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                                    <Tag className="h-3 w-3" />
                                                    {note.subject}
                                                </div>

                                                <div className="flex justify-between items-center text-sm mb-4">
                                                    <span className="text-muted-foreground">Purchased for</span>
                                                    <span className="font-bold font-mono">{note.purchasePrice} MON</span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <a href={getIpfsUrl(note.ipfs_hash)} target="_blank" rel="noopener noreferrer" className="flex-1">
                                                        <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                                                            <Download className="h-4 w-4" />
                                                            Download
                                                        </Button>
                                                    </a>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Sales History Tab */}
                        {activeTab === 'sales' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                            >
                                {salesHistory.length === 0 ? (
                                    <div className="text-center py-16">
                                        <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-xl font-bold mb-2">No Sales Yet</h3>
                                        <p className="text-muted-foreground mb-6">
                                            Your sales will appear here when people buy your notes
                                        </p>
                                    </div>
                                ) : (
                                    <div className="card-protocol overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b border-white/10">
                                                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Note</th>
                                                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">Buyer</th>
                                                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Price</th>
                                                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Your Earnings</th>
                                                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {salesHistory.map((sale, i) => (
                                                    <tr key={i} className="border-b border-white/5 hover:bg-secondary/20">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                                    <BookOpen className="h-4 w-4 text-purple-400" />
                                                                </div>
                                                                <span className="font-medium">{sale.title}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-sm text-muted-foreground">
                                                            {sale.buyer.slice(0, 6)}...{sale.buyer.slice(-4)}
                                                        </td>
                                                        <td className="p-4 text-right font-mono">{sale.price} MON</td>
                                                        <td className="p-4 text-right font-mono text-green-400">+{sale.yourEarnings} MON</td>
                                                        <td className="p-4 text-right text-sm text-muted-foreground">
                                                            {new Date(sale.soldAt).toLocaleDateString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}
