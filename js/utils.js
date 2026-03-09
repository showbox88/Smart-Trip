import { state } from './state.js';

export function formatDistance(meters) {
    if (isNaN(meters)) return meters;
    const isKm = state.settings.unitDistance === 'km';
    if (isKm) {
        const km = meters / 1000;
        return `${km.toFixed(1)} km`;
    } else {
        const miles = meters * 0.000621371;
        return `${miles.toFixed(1)} mi`;
    }
}

export function formatDuration(seconds) {
    if (isNaN(seconds)) return seconds;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);

    // Use window.t if available (set in main.js or i18n.js)
    const translator = window.t || ((k) => k);

    const hrUnit = translator('itinerary.time_unit_hour');
    const minUnit = translator('itinerary.time_unit_minute');

    if (h > 0) {
        return `${h} ${hrUnit} ${m} ${minUnit}`;
    }
    return `${m} ${minUnit}`;
}

export function formatCurrency(amount) {
    const currency = state.settings.currency || 'USD';
    const amountVal = parseFloat(amount) || 0;
    const symbols = { 'USD': '$', 'CNY': '¥', 'EUR': '€', 'JPY': '¥', 'GBP': '£' };
    const symbol = symbols[currency] || '$';
    return `${symbol}${amountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTemp(c) {
    if (isNaN(c)) return c;
    const isC = state.settings.unitTemp === 'c';
    if (isC) return `${c}°C`;
    const f = (c * 9 / 5) + 32;
    return `${Math.round(f)}°F`;
}

export function generateId(prefix = 'id') {
    return prefix + '-' + Date.now() + Math.random().toString(36).substr(2, 5);
}

export function formatDate(dateStr, dayIndex = 0) {
    if (!dateStr) return '';
    // Normalize date string if it contains Chinese characters
    let normalized = dateStr;
    if (dateStr.includes('年')) {
        normalized = dateStr.replace('年', '-').replace('月', '-').replace('日', '');
    }
    const d = new Date(normalized.replace(/-/g, '/'));
    if (isNaN(d)) return dateStr;
    if (dayIndex !== 0) {
        d.setDate(d.getDate() + dayIndex);
    }
    const isEn = state.settings.language === 'en';
    if (isEn) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function calculateDays(start, end) {
    const d1 = new Date(start.replace(/-/g, '/'));
    const d2 = new Date(end.replace(/-/g, '/'));
    if (isNaN(d1) || isNaN(d2)) return 0;
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function getTripStays(trip) {
    if (!trip || !trip.days) return [];
    const staysMap = new Map();

    trip.days.forEach(day => {
        day.stops.forEach(stop => {
            if (stop.stayId) {
                if (!staysMap.has(stop.stayId)) {
                    staysMap.set(stop.stayId, {
                        id: stop.stayId,
                        location: stop.location,
                        checkinDayId: null,
                        checkinTime: null,
                        checkinPeriod: null,
                        checkoutDayId: null,
                        checkoutTime: null,
                        checkoutPeriod: null,
                        hotelStop: stop // Keep reference to one of the stops for info
                    });
                }
                const stay = staysMap.get(stop.stayId);
                if (stop.type === 'hotel_checkin') {
                    stay.checkinDayId = day.id;
                    stay.checkinTime = stop.time;
                    stay.checkinPeriod = stop.period;
                } else if (stop.type === 'hotel_checkout') {
                    stay.checkoutDayId = day.id;
                    stay.checkoutTime = stop.time;
                    stay.checkoutPeriod = stop.period;
                }
            }
        });
    });

    return Array.from(staysMap.values()).filter(s => s.checkinDayId && s.checkoutDayId);
}
