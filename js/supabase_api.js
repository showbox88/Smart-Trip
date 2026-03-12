import { state, updateState } from './state.js';

// ==========================================
// SUPABASE SERVICES (v2: Relational Schema)
// ==========================================

const SUPABASE_URL = 'https://sqkhtmsjflrfjajingfg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_b3KnWUwrDd7s18j5mOvzCw_ry4Tp04k';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

/**
 * AUTH FUNCTIONS
 */
export async function signUp(email, password, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });
    if (error) throw error;
    return data;
}

export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) throw error;
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/**
 * PHASE 2 LOAD:
 */
export async function loadData() {
    console.log("[Supabase API] ⏳ Authenticating...");
    try {
        // First, check for an existing session in local storage (very fast)
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;

        if (!user) {
            console.warn("[Supabase API] 🔒 No active session found.");
            // Reset state just in case
            updateState({ user: null, trips: [] });
            return;
        }

        // --- CRITICAL: Set user state IMMEDIATELY to prevent login page flicker ---
        updateState({ user: { 
            id: user.id, 
            email: user.email, 
            name: user.user_metadata?.full_name || user.email.split('@')[0] 
        }});
        console.log("[Supabase API] 👤 Welcome back,", user.email);

        // --- Now proceed to load data in background ---
        console.log("[Supabase API] 📦 Fetching your data...");
        
        // 1. Settings (use user.id as primary key)
        const { data: settingsData } = await supabase
            .from('user_settings')
            .select('settings')
            .eq('id', user.id)
            .single();

        if (settingsData && settingsData.settings) {
            updateState({ settings: settingsData.settings });
        }

        // 2. Trips
        const { data: tripsData, error: tripsError } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (tripsError) throw tripsError;
        
        if (tripsData) {
            const reconstructedTrips = tripsData.map(row => ({
                ...row.trip_data,
                id: row.id,
                title: row.title,
                thumb: row.thumb
            }));
            updateState({ trips: reconstructedTrips });
            console.log(`[Supabase API] ✅ ${reconstructedTrips.length} trips loaded.`);
        }
    } catch (e) {
        console.error("[Supabase API] Sync Error:", e.message);
    }
}


/**
 * PHASE 2 SAVE:
 */
export async function saveData() {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        console.log("[Supabase API] ☁️ Saving changes for user:", user.email);

        // --- 1. Save Settings ---
        await supabase
            .from('user_settings')
            .upsert({ id: user.id, settings: state.settings });

        // --- 2. Save Trips (Active Trip) ---
        const activeTrip = state.trips.find(t => t.id === state.activeTripId);
        if (activeTrip) {
            await supabase
                .from('trips')
                .upsert({
                    id: activeTrip.id,
                    user_id: user.id, // Ensure user_id is set
                    title: activeTrip.title,
                    thumb: activeTrip.thumb,
                    trip_data: activeTrip 
                });
        }
    } catch (e) {
        console.error("[Supabase API] Save Error:", e.message);
    }
}

/**
 * Delete a single trip row from Supabase by its ID,
 * and also remove all associated images from Supabase Storage.
 */
export async function deleteTripById(tripId) {
    try {
        const user = await getCurrentUser();
        if (!user) return;

        console.log("[Supabase API] 🗑️ Deleting trip:", tripId);

        // --- 1. Collect all image URLs belonging to this trip ---
        // Find the trip in local state (it's still in state.trips at this point
        // because we call deleteTripById after removing from local state in the UI,
        // but the caller passes the tripId so we need to query the DB or use the
        // trip we fetched from Supabase. To be safe, fetch the trip data from DB first.)
        const { data: tripRow } = await supabase
            .from('trips')
            .select('thumb, trip_data')
            .eq('id', tripId)
            .eq('user_id', user.id)
            .single();

        if (tripRow) {
            const imageUrls = [];

            // Cover thumbnail
            if (tripRow.thumb) imageUrls.push(tripRow.thumb);

            // All stop images within the trip_data
            const tripData = tripRow.trip_data;
            if (tripData && tripData.days) {
                tripData.days.forEach(day => {
                    (day.stops || []).forEach(stop => {
                        if (stop.thumb) imageUrls.push(stop.thumb);
                        if (stop.image) imageUrls.push(stop.image);
                        if (stop.photo) imageUrls.push(stop.photo);
                    });
                });
            }

            // Filter to only Supabase-hosted URLs and delete them
            const supabaseImages = imageUrls.filter(url =>
                url && url.includes('/trip-media/')
            );
            if (supabaseImages.length > 0) {
                console.log(`[Supabase API] 🖼️ Cleaning up ${supabaseImages.length} image(s)...`);
                await deleteImages(supabaseImages);
            }
        }

        // --- 2. Delete the trip row ---
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', tripId)
            .eq('user_id', user.id);

        if (error) throw error;

        // Also persist settings while we're here
        await supabase
            .from('user_settings')
            .upsert({ id: user.id, settings: state.settings });

        console.log("[Supabase API] ✅ Trip and images deleted:", tripId);
    } catch (e) {
        console.error("[Supabase API] Delete Trip Error:", e.message);
    }
}

/**
 * Migration helper: Move data from 'app_data' (old) to 'trips' + 'user_settings' (new)
 */
export async function migrateFromV1() {
    console.log("[Supabase API] 🚛 Starting migration from V1 (Monolith) to V2 (Relational)...");
    try {
        const { data: v1Data, error: v1Error } = await supabase.from('app_data').select('state').eq('id', 'main_state').single();
        
        if (v1Error) {
            console.error("[Supabase API] ❌ Failed to fetch V1 data:", v1Error.message);
            return;
        }

        if (!v1Data || !v1Data.state) {
            console.warn("[Supabase API] ⚠️ No V1 data found in 'app_data' table (id: main_state). Nothing to migrate.");
            return;
        }

        const oldState = v1Data.state;
        console.log("[Supabase API] 📦 Found V1 data. Settings present:", !!oldState.settings, "Trips count:", oldState.trips?.length || 0);

        // 1. Migrate settings
        if (oldState.settings) {
            console.log("[Supabase API] ⚙️ Migrating settings...");
            const { error: sError } = await supabase.from('user_settings').upsert({ id: 'global', settings: oldState.settings });
            if (sError) console.error("Settings migration error:", sError.message);
        }

        // 2. Migrate each trip to its own row
        if (oldState.trips && oldState.trips.length > 0) {
            console.log(`[Supabase API] 🗺️ Migrating ${oldState.trips.length} trips...`);
            for (const trip of oldState.trips) {
                console.log(`[Supabase API]   -> Migrating trip: ${trip.title} (${trip.id})`);
                const { error: tError } = await supabase.from('trips').upsert({
                    id: trip.id,
                    title: trip.title,
                    thumb: trip.thumb,
                    trip_data: trip
                });
                if (tError) console.error(`Trip ${trip.id} migration error:`, tError.message);
            }
        }
        console.log("[Supabase API] 🎉 Migration process finished!");
    } catch (e) {
        console.error("[Supabase API] ❌ Migration CRASHED:", e);
        throw e;
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
