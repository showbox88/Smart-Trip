import * as localApi from './local_api.js';
import * as cloudApi from './supabase_api.js';

// Configuration flag: Enable to switch to Supabase Cloud backend
// False = Uses original Python server (server.py + db.json)
// True = Uses Supabase BaaS (PostgreSQL + Storage)
const USE_CLOUD_BACKEND = true;

// -------------------------------------------------------------
// Unified API Gateway
// -------------------------------------------------------------

export async function loadData() {
    return USE_CLOUD_BACKEND ? await cloudApi.loadData() : await localApi.loadData();
}

export async function saveData() {
    return USE_CLOUD_BACKEND ? await cloudApi.saveData() : await localApi.saveData();
}

export async function deleteImages(urls) {
    return USE_CLOUD_BACKEND ? await cloudApi.deleteImages(urls) : await localApi.deleteImages(urls);
}

export async function uploadLocal(base64Data) {
    return USE_CLOUD_BACKEND ? await cloudApi.uploadLocalBase64(base64Data) : await localApi.uploadLocal(base64Data);
}

export async function uploadImage(url) {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.uploadRemoteImage(url);
    } else {
        try {
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            return await response.json();
        } catch (e) {
            console.error("[Local API] Remote image cache failed:", e);
            return { status: 'error', message: e.message };
        }
    }
}

export async function cleanupImages() {
    return USE_CLOUD_BACKEND ? await cloudApi.cleanupImages() : await localApi.cleanupImages();
}

export async function deleteTripById(tripId) {
    if (USE_CLOUD_BACKEND) return await cloudApi.deleteTripById(tripId);
    // Local fallback: data is fully managed by saveData() writing the whole state,
    // so no extra step is needed for the local API.
}

export async function getAvailableLanguages() {
    return USE_CLOUD_BACKEND ? await cloudApi.getAvailableLanguages() : await localApi.getAvailableLanguages();
}

// Auth Bridge
export async function signIn(email, password) {
    if (USE_CLOUD_BACKEND) return await cloudApi.signIn(email, password);
    // Mock local login
    return { user: { email } };
}

export async function signUp(email, password, metadata) {
    if (USE_CLOUD_BACKEND) return await cloudApi.signUp(email, password, metadata);
    return { user: { email } };
}

export async function signOut() {
    if (USE_CLOUD_BACKEND) return await cloudApi.signOut();
}

export async function getCurrentUser() {
    if (USE_CLOUD_BACKEND) return await cloudApi.getCurrentUser();
    return null;
}
