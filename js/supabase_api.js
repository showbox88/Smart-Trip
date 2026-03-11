import { state, updateState } from './state.js';

// ==========================================
// SUPABASE SERVICES
// Initialize the Supabase Client
// ==========================================

const SUPABASE_URL = 'https://sqkhtmsjflrfjajingfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b3KnWUwrDd7s18j5mOvzCw_ry4Tp04k';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

export async function loadData() {
    console.log("[Supabase API] ⏳ Fetching state from Cloud...");
    try {
        const { data, error } = await supabase
            .from('app_data')
            .select('state')
            .eq('id', 'main_state')
            .single();

        if (error && error.code !== 'PGRST116') { // Ignore "Rows not found" error on first run
            console.error("Supabase Error:", error.message);
            throw error;
        }
        
        if (data && data.state) {
            console.log("[Supabase API] ✅ Data successfully loaded!");
            updateState(data.state);
        } else {
            console.warn('[Supabase API] 📂 Database is empty. Using default local state.');
        }
    } catch (e) {
        console.error("Failed to load DB from Supabase.", e);
    }
}

export async function saveData() {
    console.log("[Supabase API] ☁️ Saving state to Cloud...");
    try {
        const { error } = await supabase
            .from('app_data')
            .upsert({ 
                id: 'main_state', 
                state: state 
            });

        if (error) {
            console.error("Supabase Save Error:", error.message);
            throw error;
        }

        console.log("[Supabase API] ✅ State successfully saved!");
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
        // Extract file paths from URLs assuming they are from Supabase Storage
        const filePaths = list.map(url => {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/storage/v1/object/public/trip-media/');
            return pathParts.length > 1 ? pathParts[1] : null;
        }).filter(p => p !== null);

        if(filePaths.length === 0) return;

        const { error } = await supabase.storage.from('trip-media').remove(filePaths);

        if (error) {
            console.error("Supabase Delete Error:", error.message);
            throw error;
        }
        
        console.log("[Supabase API] ✅ Images deleted successfully!");
    } catch (e) {
        console.warn('[deleteImages] Failed in Supabase:', e);
    }
}
