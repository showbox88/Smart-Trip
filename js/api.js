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
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.loadData();
    } else {
        return await localApi.loadData();
    }
}

export async function saveData() {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.saveData();
    } else {
        return await localApi.saveData();
    }
}

export async function deleteImages(urls) {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.deleteImages(urls);
    } else {
        return await localApi.deleteImages(urls);
    }
}

export async function uploadLocal(base64Data) {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.uploadLocalBase64(base64Data);
    } else {
        return await localApi.uploadLocal(base64Data);
    }
}

export async function uploadImage(url) {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.uploadRemoteImage(url);
    } else {
        // Local: Call the python server's endpoint
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
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.cleanupImages();
    } else {
        return await localApi.cleanupImages();
    }
}

export async function getAvailableLanguages() {
    if (USE_CLOUD_BACKEND) {
        return await cloudApi.getAvailableLanguages();
    } else {
        return await localApi.getAvailableLanguages();
    }
}

export async function migrateData() {
    if (USE_CLOUD_BACKEND && cloudApi.migrateFromV1) {
        return await cloudApi.migrateFromV1();
    }
}




