import { state, updateState } from './state.js';

export async function loadData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            if (data.trips) {
                updateState(data);
            }
        }
    } catch (e) {
        console.error("Failed to load DB from server. Running with empty defaults.", e);
    }
}

export async function saveData() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.error("Failed to save data:", e);
    }
}

/**
 * Delete one or more locally-cached images from the server.
 * @param {string|string[]} urls - A single URL or array of URLs like "/uploads/abc.jpg"
 */
export async function deleteImages(urls) {
    if (!urls) return;
    const list = (Array.isArray(urls) ? urls : [urls])
        .filter(u => u && typeof u === 'string' && u.startsWith('/uploads/'));
    if (list.length === 0) return;
    try {
        await fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: list })
        });
        console.log('[deleteImages] Removed:', list);
    } catch (e) {
        console.warn('[deleteImages] Failed:', e);
    }
}
