-- ============================================
-- EduTrust Notes Marketplace - Supabase Schema
-- ============================================
-- Run this in your Supabase SQL Editor to set up the database
-- https://supabase.com/dashboard/project/_/sql

-- ============================================
-- 1. NOTES TABLE
-- ============================================
-- Stores metadata for minted notes (mirrors on-chain data)
CREATE TABLE IF NOT EXISTS notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    description TEXT,
    ipfs_hash VARCHAR(100) NOT NULL,
    preview_hash VARCHAR(100),
    metadata_hash VARCHAR(100),
    creator_address VARCHAR(42) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_creator ON notes(creator_address);
CREATE INDEX IF NOT EXISTS idx_notes_subject ON notes(subject);
CREATE INDEX IF NOT EXISTS idx_notes_token_id ON notes(token_id);

-- Full text search
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================
-- 2. LISTINGS TABLE
-- ============================================
-- Stores marketplace listings
CREATE TABLE IF NOT EXISTS listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id INTEGER NOT NULL REFERENCES notes(token_id),
    seller_address VARCHAR(42) NOT NULL,
    price_mon DECIMAL(18, 4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    listed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sold_at TIMESTAMP WITH TIME ZONE,
    buyer_address VARCHAR(42),
    
    CONSTRAINT price_range CHECK (price_mon >= 10 AND price_mon <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_active ON listings(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_listings_seller ON listings(seller_address);
CREATE INDEX IF NOT EXISTS idx_listings_token_id ON listings(token_id);
CREATE INDEX IF NOT EXISTS idx_listings_price ON listings(price_mon);

-- ============================================
-- 3. TRANSACTIONS TABLE
-- ============================================
-- Records all marketplace transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token_id INTEGER NOT NULL,
    tx_hash VARCHAR(66) NOT NULL UNIQUE,
    tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('mint', 'list', 'delist', 'buy', 'withdraw')),
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42),
    price_mon DECIMAL(18, 4),
    platform_fee_mon DECIMAL(18, 4),
    royalty_mon DECIMAL(18, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_token ON transactions(token_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_address);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(tx_type);

-- ============================================
-- 4. USER PROFILES TABLE
-- ============================================
-- Optional user profile data
CREATE TABLE IF NOT EXISTS user_profiles (
    address VARCHAR(42) PRIMARY KEY,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    total_sales INTEGER DEFAULT 0,
    total_purchases INTEGER DEFAULT 0,
    total_earnings_mon DECIMAL(18, 4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. VIEWS FOR COMMON QUERIES
-- ============================================

-- Active listings with note details
CREATE OR REPLACE VIEW active_listings_view AS
SELECT 
    l.*,
    n.title,
    n.subject,
    n.description,
    n.ipfs_hash,
    n.preview_hash,
    n.creator_address,
    n.created_at as note_created_at
FROM listings l
JOIN notes n ON l.token_id = n.token_id
WHERE l.is_active = TRUE;

-- Sales leaderboard
CREATE OR REPLACE VIEW sales_leaderboard AS
SELECT 
    n.creator_address,
    COUNT(DISTINCT l.id) as total_sales,
    SUM(l.price_mon) as total_revenue
FROM listings l
JOIN notes n ON l.token_id = n.token_id
WHERE l.sold_at IS NOT NULL
GROUP BY n.creator_address
ORDER BY total_revenue DESC;

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to tables
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
    BEFORE UPDATE ON notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update user stats on sale
CREATE OR REPLACE FUNCTION update_user_stats_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- Update seller stats
    INSERT INTO user_profiles (address, total_sales, total_earnings_mon)
    VALUES (NEW.seller_address, 1, NEW.price_mon * 0.90)  -- 90% after fees
    ON CONFLICT (address) DO UPDATE
    SET 
        total_sales = user_profiles.total_sales + 1,
        total_earnings_mon = user_profiles.total_earnings_mon + (NEW.price_mon * 0.90),
        updated_at = NOW();
    
    -- Update buyer stats
    IF NEW.buyer_address IS NOT NULL THEN
        INSERT INTO user_profiles (address, total_purchases)
        VALUES (NEW.buyer_address, 1)
        ON CONFLICT (address) DO UPDATE
        SET 
            total_purchases = user_profiles.total_purchases + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_user_stats ON listings;
CREATE TRIGGER trigger_update_user_stats
    AFTER UPDATE OF sold_at ON listings
    FOR EACH ROW
    WHEN (OLD.sold_at IS NULL AND NEW.sold_at IS NOT NULL)
    EXECUTE FUNCTION update_user_stats_on_sale();

-- ============================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Notes: Anyone can read, only system can insert/update
CREATE POLICY "Notes are viewable by everyone" ON notes
    FOR SELECT USING (true);

CREATE POLICY "Notes can be inserted via API" ON notes
    FOR INSERT WITH CHECK (true);

-- Listings: Anyone can read active, only seller can modify their own
CREATE POLICY "Active listings are viewable by everyone" ON listings
    FOR SELECT USING (true);

CREATE POLICY "Listings can be inserted via API" ON listings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Listings can be updated via API" ON listings
    FOR UPDATE USING (true);

-- Transactions: Anyone can read, only system can insert
CREATE POLICY "Transactions are viewable by everyone" ON transactions
    FOR SELECT USING (true);

CREATE POLICY "Transactions can be inserted via API" ON transactions
    FOR INSERT WITH CHECK (true);

-- User profiles: Anyone can read, users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON user_profiles
    FOR SELECT USING (true);

CREATE POLICY "Profiles can be inserted via API" ON user_profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Profiles can be updated via API" ON user_profiles
    FOR UPDATE USING (true);

-- ============================================
-- 8. SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data
/*
INSERT INTO notes (token_id, title, subject, description, ipfs_hash, preview_hash, creator_address) VALUES
(1, 'Complete Data Structures & Algorithms', 'Computer Science', 'Comprehensive notes covering arrays, linked lists, trees, graphs, and all major algorithms.', 'QmSampleHash1', 'QmPreviewHash1', '0x742d35Cc6634C0532925a3b844Bc454e4438f44e'),
(2, 'Organic Chemistry Master Notes', 'Chemistry', 'All reactions, mechanisms, and stereochemistry explained with diagrams.', 'QmSampleHash2', 'QmPreviewHash2', '0x1234567890123456789012345678901234567890'),
(3, 'Calculus III Complete Summary', 'Mathematics', 'Multivariable calculus, partial derivatives, multiple integrals, and vector calculus.', 'QmSampleHash3', 'QmPreviewHash3', '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd');

INSERT INTO listings (token_id, seller_address, price_mon) VALUES
(1, '0x742d35Cc6634C0532925a3b844Bc454e4438f44e', 25),
(2, '0x1234567890123456789012345678901234567890', 30),
(3, '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 20);
*/

-- ============================================
-- DONE! Your database is ready.
-- ============================================
