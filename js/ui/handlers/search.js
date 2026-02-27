import { state } from '../../state.js';
import { autoAddStop } from './stops.js';
import { saveTripMetadata } from './trips.js';

let autocompleteService = null;
let searchTimeout = null;
let currentSearchFocusIdx = -1;
let currentSearchPredictions = [];

export function handleSearchInput(event, dayId) {
    const query = event.target.value.trim();
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query) {
        dropdown.classList.remove('active');
        currentSearchFocusIdx = -1;
        currentSearchPredictions = [];
        return;
    }

    if (query.length < 2) {
        dropdown.classList.remove('active');
        return;
    }

    if (!window.googleMapsReady || typeof google === 'undefined') {
        return;
    }

    if (!autocompleteService) {
        autocompleteService = new google.maps.places.AutocompleteService();
    }

    searchTimeout = setTimeout(() => {
        autocompleteService.getPlacePredictions({ input: query }, (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                let errorMsg = '未找到结果';
                if (status === 'REQUEST_DENIED') errorMsg = 'Google Maps API 权限错误';
                if (status === 'OVER_QUERY_LIMIT') errorMsg = 'Google Maps API 额度超限';
                dropdown.innerHTML = `<li style="color:var(--text-secondary); padding: 1rem; text-align:center;">${errorMsg} (${status})</li>`;
                dropdown.classList.add('active');
                return;
            }

            currentSearchPredictions = predictions;
            currentSearchFocusIdx = -1;
            dropdown.innerHTML = predictions.map((p, idx) => `
                <li onmousedown="handleDropdownClick('${dayId}', '${p.place_id}')">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:600; color:var(--text-primary); font-size:1.1rem;">
                            <span style="color:var(--text-secondary); margin-right:8px;">📍</span>${p.structured_formatting.main_text}
                        </span>
                        <span style="font-size:0.85rem; color:var(--text-secondary); padding-left:26px;">
                            ${p.structured_formatting.secondary_text || ''}
                        </span>
                    </div>
                </li>
            `).join('');
            dropdown.classList.add('active');
        });
    }, 250);
}

export function handleSearchKeyDown(e, dayId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (!dropdown || !dropdown.classList.contains('active')) return;

    const items = dropdown.querySelectorAll('li');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSearchFocusIdx++;
        if (currentSearchFocusIdx >= items.length) currentSearchFocusIdx = 0;
        updateSearchFocus(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSearchFocusIdx--;
        if (currentSearchFocusIdx < 0) currentSearchFocusIdx = items.length - 1;
        updateSearchFocus(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSearchFocusIdx >= 0 && currentSearchFocusIdx < currentSearchPredictions.length) {
            handleDropdownClick(dayId, currentSearchPredictions[currentSearchFocusIdx].place_id);
        }
    }
}

function updateSearchFocus(items) {
    items.forEach((item, idx) => {
        if (idx === currentSearchFocusIdx) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

export function handleDropdownClick(dayId, placeId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (dropdown) dropdown.classList.remove('active');

    const container = dropdown ? dropdown.closest('.location-search-container') : null;
    if (container) {
        const input = container.querySelector('.location-search-input');
        if (input) {
            input.value = '加载中 (Loading)...';
            input.disabled = true;
        }
    }

    currentSearchFocusIdx = -1;
    currentSearchPredictions = [];

    autoAddStop(dayId, placeId);
}

// Image Search
export async function searchImages(passedQuery) {
    try {
        const inputField = document.getElementById('image-search-input') || document.getElementById('trip-edit-search');
        let q = (passedQuery || (inputField ? inputField.value.trim() : '') || 'travel').trim();

        if (inputField && passedQuery) {
            inputField.value = q;
        }

        const grid = document.getElementById('image-results-grid') || document.getElementById('image-grid');
        if (!grid) return;

        grid.innerHTML = '<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 1rem 0;">搜索高质图片中...</p>';

        const tags = q.split(/\s+/).join(',');
        let html = '';
        const timestamp = Date.now();
        for (let i = 1; i <= 9; i++) {
            const url = `https://loremflickr.com/600/400/${encodeURIComponent(tags)}?lock=${i + 300}&t=${timestamp}`;
            html += `<div class="image-thumb-option" onclick="selectImage(event, '${url}')" ondblclick="selectImage(event, '${url}'); saveTripMetadata()" style="background-image:url('${url}')"></div>`;
        }

        setTimeout(() => {
            const freshGrid = document.getElementById('image-results-grid') || document.getElementById('image-grid');
            if (freshGrid) {
                freshGrid.innerHTML = html;
            }
        }, 400);
    } catch (e) {
        console.error("SearchImages failed:", e);
    }
}

export function selectImage(event, url) {
    if (event) event.stopPropagation();
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (trip) {
        trip.thumb = url;
    }

    // Also update hidden input if it exists (for original modal style)
    const hiddenInput = document.getElementById('trip-edit-thumb');
    if (hiddenInput) hiddenInput.value = url;

    document.querySelectorAll('.image-thumb-option').forEach(el => el.classList.remove('selected'));
    if (event && event.target) event.target.classList.add('selected');
}
