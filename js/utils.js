import { PLACE_CATEGORY_MAP } from './constants.js';

export function getCategoryFromTypes(types) {
    if (!types || !types.length) return { icon: '📍', label: '地点' };
    for (const type of types) {
        if (PLACE_CATEGORY_MAP[type]) return PLACE_CATEGORY_MAP[type];
    }
    return { icon: '📍', label: '地点' };
}

export function generateId(prefix = 'id') {
    return prefix + '-' + Date.now() + Math.random().toString(36).substr(2, 5);
}

export function formatDate(dateStr) {
    const d = new Date(dateStr.replace(/-/g, '/'));
    return !isNaN(d) ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : dateStr;
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
