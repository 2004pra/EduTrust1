import { useState } from 'react';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/contexts/WalletContext';
import { Link, useNavigate } from 'react-router-dom';
import {
    BookOpen, Upload, FileText, Image, Tag, DollarSign,
    Loader2, CheckCircle, AlertCircle, ArrowLeft, Info,
    Wallet, ExternalLink
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadNoteBundle } from '@/services/IpfsService';
import { mintNote, listNoteForSale, MARKETPLACE_ADDRESSES } from '@/services/MarketplaceService';
import { saveNote, saveListing, saveTransaction } from '@/services/SupabaseService';

const subjects = [
    "Computer Science",
    "Mathematics",
    "Chemistry",
    "Physics",
    "Economics",
    "Law",
    "Biology",
    "Engineering",
    "Medicine",
    "Business",
    "Arts & Humanities",
    "Other"
];

export default function MintNote() {
    const { isConnected, address, connect } = useWallet();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        price: '',
    });
    const [noteFile, setNoteFile] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isMinting, setIsMinting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [mintStep, setMintStep] = useState<'form' | 'uploading' | 'minting' | 'listing' | 'success'>('form');
    const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNoteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file type
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                toast({
                    title: "Invalid File Type",
                    description: "Please upload a PDF or image file (JPG, PNG, WEBP)",
                    variant: "destructive"
                });
                return;
            }
            // Validate file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                toast({
                    title: "File Too Large",
                    description: "Maximum file size is 50MB",
                    variant: "destructive"
                });
                return;
            }
            setNoteFile(file);
        }
    };

    const handlePreviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast({
                    title: "Invalid File Type",
                    description: "Preview must be an image file",
                    variant: "destructive"
                });
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast({
                    title: "File Too Large",
                    description: "Preview image max 5MB",
                    variant: "destructive"
                });
                return;
            }
            setPreviewFile(file);
        }
    };

    const validateForm = (): boolean => {
        if (!formData.title.trim()) {
            toast({ title: "Title Required", description: "Please enter a title for your notes", variant: "destructive" });
            return false;
        }
        if (!formData.subject) {
            toast({ title: "Subject Required", description: "Please select a subject", variant: "destructive" });
            return false;
        }
        if (!formData.description.trim()) {
            toast({ title: "Description Required", description: "Please add a description", variant: "destructive" });
            return false;
        }
        if (!noteFile) {
            toast({ title: "File Required", description: "Please upload your notes file", variant: "destructive" });
            return false;
        }
        if (!formData.price) {
            toast({ title: "Price Required", description: "Please set a price", variant: "destructive" });
            return false;
        }
        const price = parseFloat(formData.price);
        if (price < 10 || price > 100) {
            toast({ title: "Invalid Price", description: "Price must be between 10 and 100 MON", variant: "destructive" });
            return false;
        }
        return true;
    };

    const handleMint = async () => {
        if (!isConnected || !address) {
            toast({
                title: "Wallet Required",
                description: "Please connect your wallet to mint notes",
                variant: "destructive"
            });
            return;
        }

        if (!validateForm() || !noteFile) return;

        try {
            // Step 1: Upload to IPFS
            setMintStep('uploading');
            setIsUploading(true);
            setUploadProgress(10);

            console.log('Starting IPFS upload...');
            const ipfsResult = await uploadNoteBundle(
                noteFile,
                previewFile,
                {
                    title: formData.title,
                    subject: formData.subject,
                    description: formData.description,
                    creator: address,
                }
            );
            setUploadProgress(100);
            console.log('IPFS upload complete:', ipfsResult);

            setIsUploading(false);

            // Step 2: Mint NFT on blockchain
            setMintStep('minting');
            setIsMinting(true);

            console.log('Minting NFT on blockchain...');
            const mintResult = await mintNote(
                formData.title,
                formData.subject,
                formData.description,
                ipfsResult.fileHash,
                ipfsResult.previewHash
            );
            console.log('Mint complete:', mintResult);
            setMintedTokenId(mintResult.tokenId);
            setTxHash(mintResult.txHash);

            // Save to database
            await saveNote({
                token_id: mintResult.tokenId,
                title: formData.title,
                subject: formData.subject,
                description: formData.description,
                ipfs_hash: ipfsResult.fileHash,
                preview_hash: ipfsResult.previewHash || null,
                metadata_hash: ipfsResult.metadataHash || null,
                creator_address: address,
            });

            // Save mint transaction
            await saveTransaction({
                token_id: mintResult.tokenId,
                tx_hash: mintResult.txHash,
                tx_type: 'mint',
                from_address: address,
                to_address: null,
                price_mon: null,
                platform_fee_mon: null,
                royalty_mon: null,
            });

            // Step 3: List on marketplace
            setMintStep('listing');

            console.log('Listing on marketplace...');
            const listTxHash = await listNoteForSale(mintResult.tokenId, parseFloat(formData.price));
            console.log('Listed on marketplace:', listTxHash);

            // Save listing to database
            await saveListing({
                token_id: mintResult.tokenId,
                seller_address: address,
                price_mon: parseFloat(formData.price),
                is_active: true,
                listed_at: new Date().toISOString(),
            });

            // Save list transaction
            await saveTransaction({
                token_id: mintResult.tokenId,
                tx_hash: listTxHash,
                tx_type: 'list',
                from_address: address,
                to_address: MARKETPLACE_ADDRESSES.NotesMarketplace,
                price_mon: parseFloat(formData.price),
                platform_fee_mon: null,
                royalty_mon: null,
            });

            setIsMinting(false);
            setMintStep('success');

            toast({
                title: "Notes Minted Successfully! 🎉",
                description: `Token #${mintResult.tokenId} is now listed for ${formData.price} MON`,
            });

        } catch (error: any) {
            console.error("Minting error:", error);
            toast({
                title: "Minting Failed",
                description: error.message || "Something went wrong. Please try again.",
                variant: "destructive"
            });
            setMintStep('form');
            setIsUploading(false);
            setIsMinting(false);
        }
    };

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
                                Connect your wallet to mint your notes as NFTs and list them for sale.
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

    if (mintStep === 'success') {
        return (
            <div className="min-h-screen bg-background">
                <Header />
                <div className="container mx-auto px-6 pt-32">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto text-center"
                    >
                        <div className="card-protocol p-8 border-green-500/30">
                            <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="h-10 w-10 text-green-500" />
                            </div>
                            <h1 className="text-2xl font-bold mb-2">Minting Complete! 🎉</h1>
                            {mintedTokenId && (
                                <p className="text-purple-400 font-mono text-sm mb-4">
                                    Token #{mintedTokenId}
                                </p>
                            )}
                            <p className="text-muted-foreground mb-6">
                                Your notes "{formData.title}" are now listed on the marketplace for {formData.price} MON.
                            </p>

                            {txHash && (
                                <a
                                    href={`https://explorer.monad.xyz/tx/${txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 mb-6"
                                >
                                    View Transaction
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            )}

                            <div className="space-y-3">
                                <Link to="/marketplace" className="block">
                                    <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600">
                                        <BookOpen className="h-4 w-4" />
                                        View Marketplace
                                    </Button>
                                </Link>
                                <Link to="/my-notes" className="block">
                                    <Button variant="outline" className="w-full gap-2">
                                        View My Notes
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setMintStep('form');
                                        setFormData({ title: '', subject: '', description: '', price: '' });
                                        setNoteFile(null);
                                        setPreviewFile(null);
                                        setMintedTokenId(null);
                                        setTxHash(null);
                                    }}
                                    className="w-full"
                                >
                                    Mint Another
                                </Button>
                            </div>
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
                        className="max-w-2xl"
                    >
                        <h1 className="text-4xl font-bold mb-4">
                            Mint Your <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Notes</span>
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Turn your study notes into NFTs. Earn from sales and get 5% royalty on every resale.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Minting Progress */}
            {(mintStep === 'uploading' || mintStep === 'minting' || mintStep === 'listing') && (
                <section className="container mx-auto px-6 pb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-2xl mx-auto"
                    >
                        <div className="card-protocol p-8">
                            <div className="text-center">
                                <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
                                <h3 className="text-xl font-bold mb-2">
                                    {mintStep === 'uploading' && 'Uploading to IPFS...'}
                                    {mintStep === 'minting' && 'Minting NFT...'}
                                    {mintStep === 'listing' && 'Listing on Marketplace...'}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {mintStep === 'uploading' && 'Your files are being uploaded to decentralized storage'}
                                    {mintStep === 'minting' && 'Confirm the transaction in your wallet'}
                                    {mintStep === 'listing' && 'Approve marketplace to list your note for sale'}
                                </p>
                                {mintStep === 'uploading' && (
                                    <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                )}
                                {/* Step indicator */}
                                <div className="flex justify-center gap-4 mt-6">
                                    <div className={`flex items-center gap-2 ${mintStep === 'uploading' ? 'text-purple-400' : 'text-green-400'}`}>
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${mintStep === 'uploading' ? 'bg-purple-500/20' : 'bg-green-500/20'}`}>
                                            {mintStep === 'uploading' ? '1' : '✓'}
                                        </div>
                                        <span className="text-sm">Upload</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${mintStep === 'minting' ? 'text-purple-400' : mintStep === 'listing' ? 'text-green-400' : 'text-muted-foreground'}`}>
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${mintStep === 'minting' ? 'bg-purple-500/20' : mintStep === 'listing' ? 'bg-green-500/20' : 'bg-secondary/50'}`}>
                                            {mintStep === 'listing' ? '✓' : '2'}
                                        </div>
                                        <span className="text-sm">Mint</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${mintStep === 'listing' ? 'text-purple-400' : 'text-muted-foreground'}`}>
                                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${mintStep === 'listing' ? 'bg-purple-500/20' : 'bg-secondary/50'}`}>
                                            3
                                        </div>
                                        <span className="text-sm">List</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </section>
            )}

            {/* Form */}
            {mintStep === 'form' && (
                <section className="container mx-auto px-6 pb-20">
                    <div className="max-w-2xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card-protocol p-8"
                        >
                            <div className="space-y-6">
                                {/* Title */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Title *</label>
                                    <Input
                                        name="title"
                                        placeholder="e.g., Complete Data Structures Notes"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Subject *</label>
                                    <select
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleInputChange}
                                        className="w-full bg-secondary/50 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    >
                                        <option value="">Select a subject</option>
                                        {subjects.map(subject => (
                                            <option key={subject} value={subject}>{subject}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Description *</label>
                                    <Textarea
                                        name="description"
                                        placeholder="Describe what's covered in your notes..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                        rows={4}
                                        className="bg-secondary/50 border-white/10"
                                    />
                                </div>

                                {/* Note File Upload */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">Notes File *</label>
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-purple-500/30 transition-colors">
                                        {noteFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <FileText className="h-8 w-8 text-purple-400" />
                                                <div className="text-left">
                                                    <p className="font-medium">{noteFile.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {(noteFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setNoteFile(null)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer">
                                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground mb-1">
                                                    Click to upload or drag and drop
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    PDF, JPG, PNG (max 50MB)
                                                </p>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                                    onChange={handleNoteFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Preview Image (Optional) */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Preview Image <span className="text-muted-foreground">(Optional)</span>
                                    </label>
                                    <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-purple-500/30 transition-colors">
                                        {previewFile ? (
                                            <div className="flex items-center justify-center gap-3">
                                                <Image className="h-8 w-8 text-purple-400" />
                                                <div className="text-left">
                                                    <p className="font-medium">{previewFile.name}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setPreviewFile(null)}
                                                    className="text-red-400 hover:text-red-300"
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        ) : (
                                            <label className="cursor-pointer">
                                                <Image className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                <p className="text-sm text-muted-foreground">
                                                    Add a preview thumbnail (max 5MB)
                                                </p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handlePreviewFileChange}
                                                    className="hidden"
                                                />
                                            </label>
                                        )}
                                    </div>
                                </div>

                                {/* Price */}
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Sale Price (MON) *
                                    </label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            name="price"
                                            type="number"
                                            min="10"
                                            max="100"
                                            step="1"
                                            placeholder="10 - 100"
                                            value={formData.price}
                                            onChange={handleInputChange}
                                            className="pl-10 bg-secondary/50 border-white/10"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Min: 10 MON | Max: 100 MON
                                    </p>
                                </div>

                                {/* Info Box */}
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                                    <div className="flex gap-3">
                                        <Info className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
                                        <div className="text-sm">
                                            <p className="font-medium text-purple-400 mb-1">Fee Structure</p>
                                            <ul className="space-y-1 text-muted-foreground">
                                                <li>• Platform fee: 5% per sale</li>
                                                <li>• Creator royalty: 5% on resales</li>
                                                <li>• You receive: 90% of first sale</li>
                                                <li>• Minimum withdrawal: 50 MON</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <Button
                                    onClick={handleMint}
                                    disabled={isMinting || isUploading}
                                    className="w-full gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 h-12 text-lg"
                                >
                                    {isMinting || isUploading ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <BookOpen className="h-5 w-5" />
                                            Mint & List Notes
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}
        </div>
    );
}
