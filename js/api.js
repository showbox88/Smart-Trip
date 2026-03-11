import * as localApi from './local_api.js';
import * as cloudApi from './supabase_api.js';

// Configuration flag: Enable to switch to Supabase Cloud backend
// False = Uses original Python server (server.py + db.json)
// True = Uses Supabase BaaS (PostgreSQL + Storage)
const USE_CLOUD_BACKEND = false;

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

// Map endpoints for direct usage in other files (like image upload routes)
export const endpoints = {
    uploadImage: USE_CLOUD_BACKEND ? '/cloud/upload-image' : '/api/upload-image',
    uploadLocal: USE_CLOUD_BACKEND ? '/cloud/upload-local' : '/api/upload-local',
};
