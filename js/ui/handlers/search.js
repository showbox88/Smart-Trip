import { state } from '../../state.js';
import { autoAddStop } from './stops.js';
import { saveTripMetadata } from './trips.js';
import { t } from '../i18n.js';

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

    searchTimeout = setTimeout(async () => {
        try {
            const { AutocompleteSuggestion } = await google.maps.importLibrary('places');
            const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query });

            if (!suggestions || suggestions.length === 0) {
                dropdown.innerHTML = `<li style="color:var(--text-secondary); padding: 1rem; text-align:center;">${t('common.not_found')}</li>`;
                dropdown.classList.add('active');
                return;
            }

            // Map to a compatible format for the rest of the code
            currentSearchPredictions = suggestions.map(s => ({
                place_id: s.placePrediction.placeId,
                main_text: s.placePrediction.mainText?.text || s.placePrediction.text.text,
                secondary_text: s.placePrediction.secondaryText?.text || ''
            }));
            currentSearchFocusIdx = -1;

            dropdown.innerHTML = currentSearchPredictions.map((p, idx) => `
                <li onmousedown="handleDropdownClick('${dayId}', '${p.place_id}')">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:600; color:var(--text-primary); font-size:1.1rem;">
                            <span style="color:var(--text-secondary); margin-right:8px;">📍</span>${p.main_text}
                        </span>
                        <span style="font-size:0.85rem; color:var(--text-secondary); padding-left:26px;">
                            ${p.secondary_text}
                        </span>
                    </div>
                </li>
            `).join('');
            dropdown.classList.add('active');
        } catch (err) {
            console.error('[search] AutocompleteSuggestion failed:', err);
            dropdown.innerHTML = `<li style="color:var(--text-secondary); padding: 1rem; text-align:center;">${t('common.fetch_error')}</li>`;
            dropdown.classList.add('active');
        }
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
    let afterStopId = null;
    if (container) {
        const input = container.querySelector('.location-search-input');
        if (input) {
            afterStopId = input.dataset.insertAfter || null;
            delete input.dataset.insertAfter; // clear after reading
            input.value = `${t('common.loading')} (Loading)...`;
            input.disabled = true;
        }
    }

    currentSearchFocusIdx = -1;
    currentSearchPredictions = [];

    autoAddStop(dayId, placeId, afterStopId);
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

        grid.innerHTML = `<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 1rem 0;">${t('common.loading')}</p>`;

        const tags = q.split(/\s+/).join(',');
        let html = '';
        const timestamp = Date.now();
        for (let i = 1; i <= 9; i++) {
            const url = `https://loremflickr.com/600/400/${encodeURIComponent(tags)}?lock=${i + 300}&t=${timestamp}`;
            html += `<div class="image-thumb-option" onclick="selectImage(event, '${url}')" ondblclick="selectImage(event, '${url}'); saveTripMetadata()" style="background-image:url('${url}')"></div>`;
        }

        setTimeout(() => {
            // If user has uploaded a file while we were searching, don't overwrite their preview
            if (window._isUploadingThumb) {
                console.log('[searchImages] Blocked overwrite because user is uploading/has uploaded a file.');
                return;
            }
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
        trip.thumb = url; // set immediately so UI feels instant
    }

    const hiddenInput = document.getElementById('trip-edit-thumb');
    if (hiddenInput) hiddenInput.value = url;

    document.querySelectorAll('.image-thumb-option').forEach(el => el.classList.remove('selected'));
    if (event && event.target) event.target.classList.add('selected');

    // Update the big modal header for immediate feedback
    const modalCover = document.querySelector('.edit-trip-modal .modal-cover');
    if (modalCover) {
        modalCover.style.backgroundImage = `url('${url}')`;
    }

    // Background: cache the image locally so it doesn't change between sessions
    // Background: cache the image so it doesn't change between sessions
    import('../../api.js').then(api => {
        api.uploadImage(url)
            .then(result => {
                if (result.status === 'success' && result.localUrl && trip) {
                    const oldThumb = trip.thumb;
                    trip.thumb = result.localUrl;
                    api.saveData(); // persist local URL so it survives browser restarts
                    // If replacing an old local upload, cleanup the old file
                    if (oldThumb && oldThumb !== result.localUrl && (oldThumb.startsWith('/uploads/') || oldThumb.includes('/trip-media/'))) {
                        api.deleteImages(oldThumb);
                    }
                    console.log('[image-cache] Trip cover cached:', result.localUrl);
                }
            })
            .catch(err => console.warn('[image-cache] Trip cover cache failed:', err));
    });
}
// Google Maps Places Photo Search for Stops
export async function searchGoogleStopImages(dayId, stopId, query) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;
    const stop = day.stops.find(s => s.id === stopId);
    if (!stop) return;

    const grid = document.getElementById('image-grid');
    if (!grid) return;

    grid.innerHTML = `<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 2rem 0; font-size:0.9rem;">${t('common.loading')}</p>`;

    try {
        const { Place } = await google.maps.importLibrary("places");
        let photos = [];

        // 1. If we have a placeId and the query is the original location (or no query), use Place ID directly (Map Logic)
        const isInitialSearch = !query || query === stop.location;
        if (stop.placeId && isInitialSearch) {
            console.log('[searchGoogleStopImages] Using Place ID for accurate photos:', stop.placeId);
            const place = new Place({ id: stop.placeId });
            await place.fetchFields({ fields: ['photos'] });
            photos = place.photos || [];
        }

        // 2. Otherwise (or if placeId fetch returned no photos), use Text Search with location bias
        if (photos.length === 0) {
            let searchTerm = query || stop.location;
            // Add address to the search term for initial searches to be more specific (Chain stores, etc.)
            if (isInitialSearch && stop.address && !searchTerm.includes(stop.address)) {
                searchTerm += ' ' + stop.address;
            }

            console.log('[searchGoogleStopImages] Falling back to Text Search:', searchTerm);

            const searchRequest = {
                textQuery: searchTerm,
                fields: ['photos', 'id'],
                maxResultCount: 1,
                language: state.settings.language === 'en' ? 'en-US' : 'zh-CN'
            };

            // Add location bias if we have coordinates to help find the correct branch/location
            if (stop.lat && stop.lng) {
                searchRequest.locationBias = new google.maps.LatLng(Number(stop.lat), Number(stop.lng));
            }

            const { places } = await Place.searchByText(searchRequest);
            if (places && places.length > 0 && places[0].photos) {
                photos = places[0].photos;
            }
        }

        if (photos.length === 0) {
            grid.innerHTML = `<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 2rem 0; font-size:0.9rem;">${t('common.not_found')} "${query || stop.location}"</p>`;
            return;
        }

        // Limit to 9 photos for the grid
        let html = '';
        photos.slice(0, 9).forEach((photo, idx) => {
            const url = photo.getURI({ maxWidth: 600 });
            html += `
                <div class="image-thumb-option" 
                     onclick="window.selectStopThumb(event, '${url}')" 
                     ondblclick="window.selectStopThumb(event, '${url}'); window.confirmStopImage('${dayId}', '${stopId}')" 
                     style="background-image:url('${url}'); border-radius:8px; height:100px; background-size:cover; background-position:center; cursor:pointer; border:2px solid transparent; transition:all 0.2s;"
                     data-url="${url}">
                </div>
            `;
        });

        grid.innerHTML = html;

    } catch (err) {
        console.error('[searchGoogleStopImages] failed:', err);
        grid.innerHTML = `<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 2rem 0; font-size:0.9rem;">${t('common.fetch_error')}</p>`;
    }
}
