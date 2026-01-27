import { supabase } from './supabase';

/**
 * Creates a new collaborative buying pool (vaca)
 */
export async function createVacaPool({ hostId, productHandle, productName, productPrice, productImage, targetAmount }) {
    const { data, error } = await supabase
        .from('vaca_pools')
        .insert({
            host_id: hostId,
            product_handle: productHandle,
            product_name: productName,
            product_price: productPrice,
            product_image: productImage,
            target_amount: targetAmount,
            current_amount: 0,
            status: 'active'
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Gets all active vaca pools
 */
export async function getActiveVacaPools() {
    const { data, error } = await supabase
        .from('vaca_pools')
        .select(`
            *,
            host:profiles(name, avatar_url),
            contributions:vaca_contributions(amount)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Checks if a pool already exists for a product by a host
 */
export async function getPoolByProduct(hostId, productHandle) {
    const { data, error } = await supabase
        .from('vaca_pools')
        .select('*')
        .eq('host_id', hostId)
        .eq('product_handle', productHandle)
        .eq('status', 'active')
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Adds a contribution to a pool
 */
export async function contributeToVaca(poolId, contributorId, amount) {
    // 1. Insert contribution
    const { error: cError } = await supabase
        .from('vaca_contributions')
        .insert({
            pool_id: poolId,
            contributor_id: contributorId,
            amount: amount
        });

    if (cError) throw cError;

    // 2. Update pool current amount (in a real app, use a DB trigger or RPC for atomicity)
    const { data: pool } = await supabase.from('vaca_pools').select('current_amount, target_amount').eq('id', poolId).single();
    const newAmount = Number(pool.current_amount) + Number(amount);

    const updates = {
        current_amount: newAmount,
        status: newAmount >= pool.target_amount ? 'completed' : 'active'
    };

    const { error: uError } = await supabase
        .from('vaca_pools')
        .update(updates)
        .eq('id', poolId);

    if (uError) throw uError;
    return true;
}
