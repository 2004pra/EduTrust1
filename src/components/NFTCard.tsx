import { motion } from 'framer-motion';
import { Shield, ExternalLink, Coins, BarChart3 } from 'lucide-react';

interface NFTCardProps {
  title: string;
  issuer: string;
  tokenId: string;
  price: string;
  timesVerified: number;
  totalEarned: string;
  imageUrl?: string;
  ipfsCid?: string;
  index?: number;
}

export function NFTCard({
  title,
  issuer,
  tokenId,
  price,
  timesVerified,
  totalEarned,
  imageUrl,
  ipfsCid,
  index = 0,
}: NFTCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="nft-card card-protocol p-5"
    >
      {/* Credential Image/Badge */}
      <div className="relative mb-4">
        <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 via-secondary to-protocol/10 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Shield className="h-12 w-12 text-primary/50" />
          )}
        </div>
        {/* Token ID Badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded bg-background/80 backdrop-blur-sm">
          <span className="text-xs font-mono text-muted-foreground">#{tokenId}</span>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
            <span className="inline-block h-4 w-4 rounded-full bg-primary/20 flex-shrink-0" />
            {issuer}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Verification Price
            </p>
            <p className="text-sm font-mono font-medium">{price} MON</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Times Verified
            </p>
            <p className="text-sm font-mono font-medium">{timesVerified}</p>
          </div>
        </div>

        {/* Total Earned */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-lg font-bold text-gradient">{totalEarned} MON</p>
          </div>
          {ipfsCid && (
            <a 
              href={`https://ipfs.io/ipfs/${ipfsCid}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-secondary hover:bg-card-hover transition-colors"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}
