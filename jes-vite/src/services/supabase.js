import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing! Authentication and DB features will be disabled.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'jes-auth-token',
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});


/**
 * Upsert user profile data
 */
export async function updateProfile(userId, updates) {
    try {
        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                ...updates,
                updated_at: new Date().toISOString(),
            });
        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error updating profile:', error);
        return { error };
    }
}

/**
 * Fetch public profiles for the community page
 */
export async function getPublicProfiles(limit = 20) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(limit)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
            console.warn('Profiles table not found. Please run the SQL setup script.');
        } else {
            console.error('Error fetching public profiles:', error);
        }
        return [];
    }
}

/**
 * Fetch a single profile with its wishlist items (from profiles table)
 */
export async function getProfileWithWishlist(userId) {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error fetching profile:', error);
        return null;
    }
}
