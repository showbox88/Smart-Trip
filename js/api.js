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
