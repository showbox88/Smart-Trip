// --- Category Icons Map ---
export const PLACE_CATEGORY_MAP = {
    // Dining
    'restaurant': { icon: '🍴', label: '餐饮' },
    'cafe': { icon: '☕', label: '咖啡馆' },
    'bar': { icon: '🍸', label: '酒吧' },
    'bakery': { icon: '🥐', label: '面包房' },
    'meal_takeaway': { icon: '🥡', label: '外卖' },
    // Transportation
    'airport': { icon: '✈️', label: '机场' },
    'train_station': { icon: '🚆', label: '火车站' },
    'transit_station': { icon: '🚉', label: '中转站' },
    'bus_station': { icon: '🚌', label: '汽车站' },
    'subway_station': { icon: '🚇', label: '地铁站' },
    // Lodging
    'lodging': { icon: '🏨', label: '住宿' },
    'hotel': { icon: '🏨', label: '住宿' },
    'motel': { icon: '🏨', label: '住宿' },
    'resort_hotel': { icon: '🏨', label: '住宿' },
    'bed_and_breakfast': { icon: '🏨', label: '住宿' },
    'guest_house': { icon: '🏨', label: '住宿' },
    'hostel': { icon: '🏨', label: '住宿' },
    'inn': { icon: '🏨', label: '住宿' },
    'apartment': { icon: '🏠', label: '住宿' },
    'vacation_rental': { icon: '🏠', label: '住宿' },
    'villa': { icon: '🏠', label: '住宿' },
    'campground': { icon: '⛺', label: '住宿' },
    'rv_park': { icon: '🚐', label: '住宿' },
    // Attractions
    'museum': { icon: '🏛️', label: '博物馆' },
    'art_gallery': { icon: '🎨', label: '美术馆' },
    'tourist_attraction': { icon: '🏛️', label: '景点' },
    'aquarium': { icon: '🐠', label: '水族馆' },
    'zoo': { icon: '🦁', label: '动物园' },
    'amusement_park': { icon: '🎡', label: '游乐园' },
    'park': { icon: '🌳', label: '公园' },
    // Shopping
    'shopping_mall': { icon: '🛍️', label: '购物中心' },
    'store': { icon: '🛍️', label: '商店' },
    'supermarket': { icon: '🛒', label: '超市' },
    // Services
    'gas_station': { icon: '⛽', label: '加油站' },
    'bank': { icon: '🏦', label: '银行' },
    'hospital': { icon: '🏥', label: '医院' },
    'pharmacy': { icon: '💊', label: '药店' },
    'parking': { icon: '🅿️', label: '停车场' }
};

export function getCategoryFromTypes(types) {
    if (!types || !types.length) return { icon: '📍', label: '地点' };
    for (const type of types) {
        if (PLACE_CATEGORY_MAP[type]) return PLACE_CATEGORY_MAP[type];
    }
    return { icon: '📍', label: '地点' };
}
