import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/contexts/WalletContext';
import { Link } from 'react-router-dom';
import {
    BookOpen, Search, Filter, ShoppingCart, Wallet, Plus,
    TrendingUp, Clock, User, Tag, ArrowRight, Loader2,
    Download, ChevronDown, Star, Eye, ExternalLink, RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { buyNote as buyNoteContract, getActiveListings as getContractListings, NoteListing } from '@/services/MarketplaceService';
import { getActiveListings as getDbListings, markListingAsSold, saveTransaction } from '@/services/SupabaseService';
import { getIpfsUrl } from '@/services/IpfsService';

interface DisplayNote {
    tokenId: number;
    title: string;
    subject: string;
    description: string;
    price: string;
    seller: string;
    creator: string;
    previewImage: string | null;
    previewHash: string | null;
    sales: number;
    listedAt: string;
}

const subjects = [
    "All Subjects",
    "Computer Science",
    "Mathematics",
    "Chemistry",
    "Physics",
    "Economics",
    "Law",
    "Biology",
    "Engineering"
];

const sortOptions = [
    { value: "newest", label: "Newest First" },
    { value: "price-low", label: "Price: Low to High" },
    { value: "price-high", label: "Price: High to Low" },
];

export default function NotesMarketplace() {
    const { isConnected, address, connect } = useWallet();
    const { toast } = useToast();
    const [notes, setNotes] = useState<DisplayNote[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSubject, setSelectedSubject] = useState("All Subjects");
    const [sortBy, setSortBy] = useState("newest");
    const [isLoading, setIsLoading] = useState(true);
    const [buyingTokenId, setBuyingTokenId] = useState<number | null>(null);

    // Fetch listings on mount
    useEffect(() => {
        fetchListings();
    }, []);

    const fetchListings = async () => {
        setIsLoading(true);
        try {
            // First try to get from Supabase/localStorage
            const dbListings = await getDbListings({ limit: 50 });

            if (dbListings.length > 0) {
                const displayNotes: DisplayNote[] = dbListings.map(listing => ({
                    tokenId: listing.token_id,
                    title: listing.note?.title || 'Untitled Note',
                    subject: listing.note?.subject || 'Other',
                    description: listing.note?.description || '',
                    price: listing.price_mon.toString(),
                    seller: formatAddress(listing.seller_address),
                    creator: formatAddress(listing.note?.creator_address || listing.seller_address),
                    previewImage: listing.note?.preview_hash ? getIpfsUrl(listing.note.preview_hash) : null,
                    previewHash: listing.note?.preview_hash || null,
                    sales: 0, // Would need to track this
                    listedAt: listing.listed_at,
                }));
                setNotes(displayNotes);
            } else {
                // If no DB data, try to fetch from blockchain
                // This is a backup for when the app is fresh
                console.log('No listings in database, checking blockchain...');
                setNotes([]);
            }
        } catch (error) {
            console.error('Error fetching listings:', error);
            setNotes([]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatAddress = (address: string): string => {
        if (!address) return 'Unknown';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    // Filter and sort notes
    const filteredNotes = notes
        .filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                note.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSubject = selectedSubject === "All Subjects" || note.subject === selectedSubject;
            return matchesSearch && matchesSubject;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "newest": return new Date(b.listedAt).getTime() - new Date(a.listedAt).getTime();
                case "price-low": return parseFloat(a.price) - parseFloat(b.price);
                case "price-high": return parseFloat(b.price) - parseFloat(a.price);
                default: return 0;
            }
        });

    const handleBuyNote = async (tokenId: number, price: string) => {
        if (!isConnected || !address) {
            toast({
                title: "Wallet Required",
                description: "Please connect your wallet to buy notes.",
                variant: "destructive"
            });
            return;
        }

        setBuyingTokenId(tokenId);

        try {
            // Execute blockchain transaction
            console.log(`Buying note #${tokenId} for ${price} MON...`);
            const txHash = await buyNoteContract(tokenId, price);
            console.log('Purchase complete:', txHash);

            // Update database
            await markListingAsSold(tokenId, address);

            // Save transaction
            const note = notes.find(n => n.tokenId === tokenId);
            await saveTransaction({
                token_id: tokenId,
                tx_hash: txHash,
                tx_type: 'buy',
                from_address: address,
                to_address: note?.seller || '',
                price_mon: parseFloat(price),
                platform_fee_mon: parseFloat(price) * 0.05,
                royalty_mon: parseFloat(price) * 0.05,
            });

            toast({
                title: "Purchase Successful! 🎉",
                description: `You bought "${note?.title}" for ${price} MON. Check My Notes!`,
            });

            // Remove from listing
            setNotes(prev => prev.filter(n => n.tokenId !== tokenId));
        } catch (error: any) {
            console.error('Purchase error:', error);
            toast({
                title: "Transaction Failed",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive"
            });
        } finally {
            setBuyingTokenId(null);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />

            {/* Hero Section */}
            <section className="relative pt-32 pb-16 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-transparent to-transparent" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/10 rounded-full blur-[150px]" />

                <div className="container mx-auto px-6 relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 mb-6">
                            <BookOpen className="h-4 w-4" />
                            <span className="text-sm font-bold">Notes Marketplace</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-bold mb-4">
                            Buy & Sell <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Study Notes</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Premium notes from top students. Every purchase supports creators with royalties.
                        </p>
                    </motion.div>

                    {/* Search and Filter Bar */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="card-protocol p-4 flex flex-col md:flex-row gap-4">
                            {/* Search Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search notes by title or description..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 bg-secondary/50 border-white/10"
                                />
                            </div>

                            {/* Subject Filter */}
                            <div className="relative">
                                <select
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    className="appearance-none bg-secondary/50 border border-white/10 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                                >
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>

                            {/* Sort */}
                            <div className="relative">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="appearance-none bg-secondary/50 border border-white/10 rounded-lg px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                                >
                                    {sortOptions.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Action Buttons */}
            <section className="container mx-auto px-6 mb-8">
                <div className="flex flex-wrap gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading...
                                </span>
                            ) : (
                                <>Showing <span className="font-bold text-foreground">{filteredNotes.length}</span> notes</>
                            )}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchListings}
                            disabled={isLoading}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/mint-note">
                            <Button className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500">
                                <Plus className="h-4 w-4" />
                                Mint Notes
                            </Button>
                        </Link>
                        <Link to="/my-notes">
                            <Button variant="outline" className="gap-2 border-purple-500/30 hover:bg-purple-500/10">
                                <BookOpen className="h-4 w-4" />
                                My Notes
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Notes Grid */}
            <section className="container mx-auto px-6 pb-20">
                {filteredNotes.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-20"
                    >
                        <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No notes found</h3>
                        <p className="text-muted-foreground mb-6">
                            Try adjusting your search or filters
                        </p>
                        <Link to="/mint-note">
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Be the first to mint notes
                            </Button>
                        </Link>
                    </motion.div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredNotes.map((note, index) => (
                            <motion.div
                                key={note.tokenId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="card-protocol p-6 hover:border-purple-500/30 transition-all duration-300 group"
                            >
                                {/* Preview Image */}
                                <div className="h-32 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 mb-4 flex items-center justify-center relative overflow-hidden">
                                    {note.previewImage ? (
                                        <img
                                            src={note.previewImage}
                                            alt={note.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                        />
                                    ) : (
                                        <BookOpen className="h-12 w-12 text-purple-400/50 group-hover:scale-110 transition-transform" />
                                    )}
                                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-bold text-purple-400">
                                        #{note.tokenId}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-purple-400 transition-colors">
                                            {note.title}
                                        </h3>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Tag className="h-3 w-3" />
                                            {note.subject}
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                        {note.description}
                                    </p>

                                    {/* Stats Row */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            {note.seller}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(note.listedAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Price and Buy */}
                                    <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Price</p>
                                            <p className="text-xl font-bold font-mono text-primary">{note.price} MON</p>
                                        </div>
                                        <Button
                                            onClick={() => handleBuyNote(note.tokenId, note.price)}
                                            disabled={buyingTokenId === note.tokenId}
                                            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                                        >
                                            {buyingTokenId === note.tokenId ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Buying...
                                                </>
                                            ) : (
                                                <>
                                                    <ShoppingCart className="h-4 w-4" />
                                                    Buy Now
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {/* Wallet Connection CTA */}
            {!isConnected && (
                <section className="container mx-auto px-6 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card-protocol p-8 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-500/20 text-center"
                    >
                        <Wallet className="h-12 w-12 text-purple-400 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">Connect Your Wallet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Connect your wallet to buy notes, mint your own, and track your earnings.
                        </p>
                        <Button
                            onClick={connect}
                            className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
                        >
                            <Wallet className="h-4 w-4" />
                            Connect Wallet
                        </Button>
                    </motion.div>
                </section>
            )}
        </div>
    );
}
