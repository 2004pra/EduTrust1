/**
 * Supabase Service - Off-chain data storage for Notes Marketplace
 * 
 * Supabase provides:
 * - PostgreSQL database with instant APIs
 * - Row Level Security for authorization
 * - Real-time subscriptions
 * - Free tier: 500MB database, unlimited API requests
 * 
 * Get started at: https://supabase.com/dashboard
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface DbNote {
    id: string;
    token_id: number;
    title: string;
    subject: string;
    description: string;
    ipfs_hash: string;
    preview_hash: string | null;
    metadata_hash: string | null;
    creator_address: string;
    created_at: string;
    updated_at: string;
}

export interface DbListing {
    id: string;
    token_id: number;
    seller_address: string;
    price_mon: number;
    is_active: boolean;
    listed_at: string;
    sold_at: string | null;
    buyer_address: string | null;
}

export interface DbTransaction {
    id: string;
    token_id: number;
    tx_hash: string;
    tx_type: 'mint' | 'list' | 'delist' | 'buy' | 'withdraw';
    from_address: string;
    to_address: string | null;
    price_mon: number | null;
    platform_fee_mon: number | null;
    royalty_mon: number | null;
    created_at: string;
}

export interface DbUserProfile {
    address: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    total_sales: number;
    total_purchases: number;
    total_earnings_mon: number;
    created_at: string;
    updated_at: string;
}

// Supabase client singleton
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
function getSupabaseClient(): SupabaseClient | null {
    if (supabaseClient) return supabaseClient;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase not configured. Using local storage fallback.');
        return null;
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    return supabaseClient;
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
    return !!getSupabaseClient();
}

// ============ NOTES CRUD ============

/**
 * Save a newly minted note to the database
 */
export async function saveNote(note: Omit<DbNote, 'id' | 'created_at' | 'updated_at'>): Promise<DbNote | null> {
    const client = getSupabaseClient();

    if (!client) {
        // Fallback to localStorage
        return saveNoteToLocalStorage(note);
    }

    try {
        const { data, error } = await client
            .from('notes')
            .insert(note)
            .select()
            .single();

        if (error) {
            console.error('Error saving note:', error);
            return saveNoteToLocalStorage(note);
        }

        return data;
    } catch (error) {
        console.error('Supabase error:', error);
        return saveNoteToLocalStorage(note);
    }
}

/**
 * Get note by token ID
 */
export async function getNoteByTokenId(tokenId: number): Promise<DbNote | null> {
    const client = getSupabaseClient();

    if (!client) {
        return getNoteFromLocalStorage(tokenId);
    }

    try {
        const { data, error } = await client
            .from('notes')
            .select('*')
            .eq('token_id', tokenId)
            .single();

        if (error) {
            return getNoteFromLocalStorage(tokenId);
        }

        return data;
    } catch {
        return getNoteFromLocalStorage(tokenId);
    }
}

/**
 * Get all notes with optional filters
 */
export async function getNotes(options: {
    subject?: string;
    creator?: string;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'created_at' | 'title';
    order?: 'asc' | 'desc';
} = {}): Promise<DbNote[]> {
    const client = getSupabaseClient();

    if (!client) {
        return getNotesFromLocalStorage(options);
    }

    try {
        let query = client
            .from('notes')
            .select('*');

        if (options.subject) {
            query = query.eq('subject', options.subject);
        }

        if (options.creator) {
            query = query.eq('creator_address', options.creator);
        }

        if (options.search) {
            query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
        }

        query = query.order(options.orderBy || 'created_at', { ascending: options.order === 'asc' });

        if (options.limit) {
            query = query.limit(options.limit);
        }

        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching notes:', error);
            return getNotesFromLocalStorage(options);
        }

        return data || [];
    } catch {
        return getNotesFromLocalStorage(options);
    }
}

// ============ LISTINGS CRUD ============

/**
 * Save a listing when a note is listed for sale
 */
export async function saveListing(listing: Omit<DbListing, 'id' | 'sold_at' | 'buyer_address'>): Promise<DbListing | null> {
    const client = getSupabaseClient();

    if (!client) {
        return saveListingToLocalStorage(listing);
    }

    try {
        const { data, error } = await client
            .from('listings')
            .insert({
                ...listing,
                sold_at: null,
                buyer_address: null,
            })
            .select()
            .single();

        if (error) {
            return saveListingToLocalStorage(listing);
        }

        return data;
    } catch {
        return saveListingToLocalStorage(listing);
    }
}

/**
 * Get active listings with optional filters
 */
export async function getActiveListings(options: {
    subject?: string;
    minPrice?: number;
    maxPrice?: number;
    seller?: string;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: 'price_mon' | 'listed_at';
    order?: 'asc' | 'desc';
} = {}): Promise<(DbListing & { note: DbNote })[]> {
    const client = getSupabaseClient();

    if (!client) {
        return getActiveListingsFromLocalStorage(options);
    }

    try {
        let query = client
            .from('listings')
            .select(`
        *,
        note:notes!inner(*)
      `)
            .eq('is_active', true);

        if (options.subject) {
            query = query.eq('note.subject', options.subject);
        }

        if (options.minPrice !== undefined) {
            query = query.gte('price_mon', options.minPrice);
        }

        if (options.maxPrice !== undefined) {
            query = query.lte('price_mon', options.maxPrice);
        }

        if (options.seller) {
            query = query.eq('seller_address', options.seller);
        }

        query = query.order(options.orderBy || 'listed_at', { ascending: options.order === 'asc' });

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching listings:', error);
            return getActiveListingsFromLocalStorage(options);
        }

        return data || [];
    } catch {
        return getActiveListingsFromLocalStorage(options);
    }
}

/**
 * Update listing when sold
 */
export async function markListingAsSold(tokenId: number, buyerAddress: string): Promise<void> {
    const client = getSupabaseClient();

    if (!client) {
        return markListingAsSoldInLocalStorage(tokenId, buyerAddress);
    }

    try {
        await client
            .from('listings')
            .update({
                is_active: false,
                sold_at: new Date().toISOString(),
                buyer_address: buyerAddress,
            })
            .eq('token_id', tokenId)
            .eq('is_active', true);
    } catch (error) {
        console.error('Error marking listing as sold:', error);
    }
}

/**
 * Deactivate listing
 */
export async function deactivateListing(tokenId: number): Promise<void> {
    const client = getSupabaseClient();

    if (!client) {
        return deactivateListingInLocalStorage(tokenId);
    }

    try {
        await client
            .from('listings')
            .update({ is_active: false })
            .eq('token_id', tokenId)
            .eq('is_active', true);
    } catch (error) {
        console.error('Error deactivating listing:', error);
    }
}

// ============ TRANSACTIONS ============

/**
 * Save a transaction record
 */
export async function saveTransaction(tx: Omit<DbTransaction, 'id' | 'created_at'>): Promise<void> {
    const client = getSupabaseClient();

    if (!client) {
        return saveTransactionToLocalStorage(tx);
    }

    try {
        await client.from('transactions').insert(tx);
    } catch (error) {
        console.error('Error saving transaction:', error);
        saveTransactionToLocalStorage(tx);
    }
}

/**
 * Get transaction history for a token
 */
export async function getTokenTransactions(tokenId: number): Promise<DbTransaction[]> {
    const client = getSupabaseClient();

    if (!client) {
        return getTokenTransactionsFromLocalStorage(tokenId);
    }

    try {
        const { data } = await client
            .from('transactions')
            .select('*')
            .eq('token_id', tokenId)
            .order('created_at', { ascending: false });

        return data || [];
    } catch {
        return getTokenTransactionsFromLocalStorage(tokenId);
    }
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(address: string): Promise<DbTransaction[]> {
    const client = getSupabaseClient();

    if (!client) {
        return getUserTransactionsFromLocalStorage(address);
    }

    try {
        const { data } = await client
            .from('transactions')
            .select('*')
            .or(`from_address.eq.${address},to_address.eq.${address}`)
            .order('created_at', { ascending: false });

        return data || [];
    } catch {
        return getUserTransactionsFromLocalStorage(address);
    }
}

// ============ USER PROFILES ============

/**
 * Get or create user profile
 */
export async function getOrCreateUserProfile(address: string): Promise<DbUserProfile> {
    const client = getSupabaseClient();

    if (!client) {
        return getOrCreateUserProfileFromLocalStorage(address);
    }

    try {
        // Try to get existing profile
        const { data: existing } = await client
            .from('user_profiles')
            .select('*')
            .eq('address', address)
            .single();

        if (existing) return existing;

        // Create new profile
        const newProfile: Partial<DbUserProfile> = {
            address,
            display_name: null,
            bio: null,
            avatar_url: null,
            total_sales: 0,
            total_purchases: 0,
            total_earnings_mon: 0,
        };

        const { data: created } = await client
            .from('user_profiles')
            .insert(newProfile)
            .select()
            .single();

        return created || getOrCreateUserProfileFromLocalStorage(address);
    } catch {
        return getOrCreateUserProfileFromLocalStorage(address);
    }
}

// ============ LOCAL STORAGE FALLBACKS ============
// These functions provide a fallback when Supabase is not configured

const LS_NOTES_KEY = 'edutrust_notes';
const LS_LISTINGS_KEY = 'edutrust_listings';
const LS_TRANSACTIONS_KEY = 'edutrust_transactions';
const LS_PROFILES_KEY = 'edutrust_profiles';

function getFromLocalStorage<T>(key: string): T[] {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function saveToLocalStorage<T>(key: string, data: T[]): void {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('LocalStorage save error:', error);
    }
}

function saveNoteToLocalStorage(note: Omit<DbNote, 'id' | 'created_at' | 'updated_at'>): DbNote {
    const notes = getFromLocalStorage<DbNote>(LS_NOTES_KEY);
    const newNote: DbNote = {
        ...note,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };
    notes.push(newNote);
    saveToLocalStorage(LS_NOTES_KEY, notes);
    return newNote;
}

function getNoteFromLocalStorage(tokenId: number): DbNote | null {
    const notes = getFromLocalStorage<DbNote>(LS_NOTES_KEY);
    return notes.find(n => n.token_id === tokenId) || null;
}

function getNotesFromLocalStorage(options: any): DbNote[] {
    let notes = getFromLocalStorage<DbNote>(LS_NOTES_KEY);

    if (options.subject) {
        notes = notes.filter(n => n.subject === options.subject);
    }
    if (options.creator) {
        notes = notes.filter(n => n.creator_address === options.creator);
    }
    if (options.search) {
        const search = options.search.toLowerCase();
        notes = notes.filter(n =>
            n.title.toLowerCase().includes(search) ||
            n.description.toLowerCase().includes(search)
        );
    }

    return notes.slice(options.offset || 0, (options.offset || 0) + (options.limit || 50));
}

function saveListingToLocalStorage(listing: any): DbListing {
    const listings = getFromLocalStorage<DbListing>(LS_LISTINGS_KEY);
    const newListing: DbListing = {
        ...listing,
        id: crypto.randomUUID(),
        sold_at: null,
        buyer_address: null,
    };
    listings.push(newListing);
    saveToLocalStorage(LS_LISTINGS_KEY, listings);
    return newListing;
}

function getActiveListingsFromLocalStorage(options: any): any[] {
    const listings = getFromLocalStorage<DbListing>(LS_LISTINGS_KEY).filter(l => l.is_active);
    const notes = getFromLocalStorage<DbNote>(LS_NOTES_KEY);

    return listings
        .map(listing => ({
            ...listing,
            note: notes.find(n => n.token_id === listing.token_id),
        }))
        .filter(l => l.note);
}

function markListingAsSoldInLocalStorage(tokenId: number, buyerAddress: string): void {
    const listings = getFromLocalStorage<DbListing>(LS_LISTINGS_KEY);
    const updated = listings.map(l =>
        l.token_id === tokenId && l.is_active
            ? { ...l, is_active: false, sold_at: new Date().toISOString(), buyer_address: buyerAddress }
            : l
    );
    saveToLocalStorage(LS_LISTINGS_KEY, updated);
}

function deactivateListingInLocalStorage(tokenId: number): void {
    const listings = getFromLocalStorage<DbListing>(LS_LISTINGS_KEY);
    const updated = listings.map(l =>
        l.token_id === tokenId && l.is_active
            ? { ...l, is_active: false }
            : l
    );
    saveToLocalStorage(LS_LISTINGS_KEY, updated);
}

function saveTransactionToLocalStorage(tx: Omit<DbTransaction, 'id' | 'created_at'>): void {
    const transactions = getFromLocalStorage<DbTransaction>(LS_TRANSACTIONS_KEY);
    transactions.push({
        ...tx,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
    });
    saveToLocalStorage(LS_TRANSACTIONS_KEY, transactions);
}

function getTokenTransactionsFromLocalStorage(tokenId: number): DbTransaction[] {
    return getFromLocalStorage<DbTransaction>(LS_TRANSACTIONS_KEY)
        .filter(tx => tx.token_id === tokenId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getUserTransactionsFromLocalStorage(address: string): DbTransaction[] {
    return getFromLocalStorage<DbTransaction>(LS_TRANSACTIONS_KEY)
        .filter(tx => tx.from_address === address || tx.to_address === address)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function getOrCreateUserProfileFromLocalStorage(address: string): DbUserProfile {
    const profiles = getFromLocalStorage<DbUserProfile>(LS_PROFILES_KEY);
    let profile = profiles.find(p => p.address === address);

    if (!profile) {
        profile = {
            address,
            display_name: null,
            bio: null,
            avatar_url: null,
            total_sales: 0,
            total_purchases: 0,
            total_earnings_mon: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        profiles.push(profile);
        saveToLocalStorage(LS_PROFILES_KEY, profiles);
    }

    return profile;
}
