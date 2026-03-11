import { state, updateState } from './state.js';

// ==========================================
// SUPABASE SERVICES
// To be implemented: Needs Supabase Client SDK
// ==========================================

export async function loadData() {
    console.log("[Supabase API] ⏳ Attempting to fetch state from Cloud...");
    try {
        // TODO: Replace with Supabase DB fetch
        // const { data, error } = await supabase.from('trips').select('*');
        // if (error) throw error;
        
        // Mock successful retrieval (currently empty)
        console.warn('Supabase DB is currently mock-empty.');
        
    } catch (e) {
        console.error("Failed to load DB from Supabase.", e);
    }
}

export async function saveData() {
    console.log("[Supabase API] ☁️ Saving entire state to Cloud...");
    try {
        // TODO: Replace with Supabase DB Upsert
        // await supabase.from('trips').upsert(state.trips)
        
    } catch (e) {
        console.error("Failed to save data to Supabase:", e);
    }
}

export async function deleteImages(urls) {
    if (!urls) return;
    const list = (Array.isArray(urls) ? urls : [urls]);
    if (list.length === 0) return;
    
    console.log("[Supabase API] 🗑️ Deleting images from Cloud Storage:", list);
    try {
        // TODO: Replace with Supabase Storage delete
        // await supabase.storage.from('app-media').remove(list)
        
    } catch (e) {
        console.warn('[deleteImages] Failed in Supabase:', e);
    }
}
