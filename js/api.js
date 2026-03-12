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
    if (!urls) return;
    const list = Array.isArray(urls) ? urls : [urls];
    const localUrls = list.filter(u => u && typeof u === 'string' && u.startsWith('/uploads/'));
    const cloudUrls = list.filter(u => u && typeof u === 'string' && u.includes('/trip-media/'));

    if (localUrls.length > 0) {
        await localApi.deleteImages(localUrls);
    }
    if (cloudUrls.length > 0) {
        await cloudApi.deleteImages(cloudUrls);
    }
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

export async function deleteTripById(tripId, imageUrls = []) {
    if (imageUrls.length > 0) {
        await deleteImages(imageUrls);
    }
    if (USE_CLOUD_BACKEND) return await cloudApi.deleteTripById(tripId);
    // Local fallback: saveData() handles the state removal, but we already cleaned up images above.
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
