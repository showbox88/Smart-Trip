import { state, updateState } from './state.js';

// ==========================================
// SUPABASE SERVICES (v2: Relational Schema)
// ==========================================

const SUPABASE_URL = 'https://sqkhtmsjflrfjajingfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b3KnWUwrDd7s18j5mOvzCw_ry4Tp04k';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * PHASE 2 LOAD:
 * 1. Fetch all rows from 'trips' table
 * 2. Fetch 'user_settings' row
 * 3. Rebuild global state
 */
export async function loadData() {
    console.log("[Supabase API v2] ⏳ Synchronizing with Cloud Database...");
    try {
        // --- 1. Load Settings ---
        const { data: settingsData, error: settingsError } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('id', 'global')
            .single();

        if (settingsData && settingsData.settings) {
            updateState({ settings: settingsData.settings });
            console.log("[Supabase API] ⚙️ Settings loaded.");
        }

        // --- 2. Load Trips ---
        const { data: tripsData, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });

        if (tripsError) throw tripsError;

        if (tripsData && tripsData.length > 0) {
            // Reconstruct the internal 'trips' array from the relational rows
            const reconstructedTrips = tripsData.map(row => ({
                ...row.trip_data,
                id: row.id,     // Ensure ID matches DB UUID
                title: row.title,
                thumb: row.thumb
            }));
            
            updateState({ trips: reconstructedTrips });
            console.log(`[Supabase API] 🗺️ ${reconstructedTrips.length} trips successfully loaded!`);
        } else {
            console.warn('[Supabase API] 📂 No trips found in cloud.');
        }

    } catch (e) {
        console.error("[Supabase API] Load Error:", e.message);
    }
}

/**
 * PHASE 2 SAVE:
 * Now only saves the pieces that changed, or uses the active context.
 */
export async function saveData() {
    console.log("[Supabase API v2] ☁️ Saving specific changes...");
    try {
        // --- 1. Save Settings ---
        await supabase
            .from('user_settings')
            .upsert({ id: 'global', settings: state.settings });

        // --- 2. Save Trips (Active Trip) ---
        // If we have an active trip, we upsert only that one
        const activeTrip = state.trips.find(t => t.id === state.activeTripId);
        if (activeTrip) {
            const { error: tripError } = await supabase
                .from('trips')
                .upsert({
                    id: activeTrip.id,
                    title: activeTrip.title,
                    thumb: activeTrip.thumb,
                    trip_data: activeTrip // Store the whole object as JSONB for backward compatibility
                });
            
            if (tripError) throw tripError;
            console.log("[Supabase API] ✅ Active trip saved.");
        } else {
            // Fallback: This might be a dashboard change, save the whole collection 
            // but in relational schema, normally we should loop or save individual rows.
            // For MVP upgrade, we'll ensure dashboard movements also trigger correct row saves.
            console.log("[Supabase API] ⏸️ No active trip to save metadata for.");
        }
        
    } catch (e) {
        console.error("[Supabase API] Save Error:", e.message);
    }
}

/**
 * Migration helper: Move data from 'app_data' (old) to 'trips' + 'user_settings' (new)
 */
export async function migrateFromV1() {
    console.log("[Supabase API] 🚛 Starting migration from V1 (Monolith) to V2 (Relational)...");
    try {
        const { data: v1Data } = await supabase.from('app_data').select('state').eq('id', 'main_state').single();
        if (!v1Data || !v1Data.state) return;

        const oldState = v1Data.state;

        // 1. Migrate settings
        if (oldState.settings) {
            await supabase.from('user_settings').upsert({ id: 'global', settings: oldState.settings });
        }

        // 2. Migrate each trip to its own row
        if (oldState.trips && oldState.trips.length > 0) {
            for (const trip of oldState.trips) {
                await supabase.from('trips').upsert({
                    id: trip.id,
                    title: trip.title,
                    thumb: trip.thumb,
                    trip_data: trip
                });
            }
        }
        console.log("[Supabase API] 🎉 Migration complete! Your data is now properly structured.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

export async function deleteImages(urls) {
    if (!urls) return;
    const list = (Array.isArray(urls) ? urls : [urls]);
    if (list.length === 0) return;
    
    try {
        const filePaths = list.map(url => {
            if (!url.includes('/trip-media/')) return null;
            const parts = url.split('/trip-media/');
            return parts[1];
        }).filter(p => p !== null);

        if(filePaths.length === 0) return;
        await supabase.storage.from('trip-media').remove(filePaths);
        console.log("[Supabase API] 🗑️ Cloud Storage cleaned.");
    } catch (e) {
        console.warn('[deleteImages] failed:', e);
    }
}

// Convert Base64 back to Blob for native Supabase upload
function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

export async function uploadLocalBase64(base64Data) {
    try {
        const blob = dataURLtoBlob(base64Data);
        const ext = blob.type.split('/')[1] || 'jpg';
        const filename = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 5)}.${ext}`;

        const { data, error } = await supabase.storage
            .from('trip-media')
            .upload(filename, blob, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from('trip-media')
            .getPublicUrl(filename);

        return { status: 'success', localUrl: publicUrlData.publicUrl };
    } catch (err) {
        return { status: 'error', message: err.message || String(err) };
    }
}

export async function uploadRemoteImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("CORS or network error fetching remote image");
        const blob = await response.blob();
        
        const ext = blob.type.split('/')[1] || 'jpg';
        const randomStr = Math.random().toString(36).substr(2, 5);
        const filename = `cache_${Date.now()}_${randomStr}.${ext}`;

        const { data, error } = await supabase.storage
            .from('trip-media')
            .upload(filename, blob, { cacheControl: '3600', upsert: true });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
            .from('trip-media')
            .getPublicUrl(filename);

        return { status: 'success', localUrl: publicUrlData.publicUrl };
    } catch (err) {
        console.warn("[Supabase API] Using original URL as fallback:", err);
        return { status: 'success', localUrl: url };
    }
}

export async function cleanupImages() {
    return { status: 'success', deleted_count: 0 };
}

export async function getAvailableLanguages() {
    return [{ code: 'zh', name: '简体中文' }, { code: 'en', name: 'English' }];
}
