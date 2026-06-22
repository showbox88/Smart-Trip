// AMap AutoComplete tip / PlaceSearch poi → 统一 place 对象(喂给 addStopFromAmapPoi)。
// place: { name, vicinity(地址), amap_poi_id, _gcj:{lat,lng}(GCJ-02), types[] }
export function amapTipToPlace(tip) {
  if (!tip || !tip.location || tip.location.lng == null) return null;
  return {
    name: tip.name || '',
    vicinity: tip.district || (typeof tip.address === 'string' ? tip.address : '') || '',
    amap_poi_id: tip.id || '',
    _gcj: { lat: Number(tip.location.lat), lng: Number(tip.location.lng) },
    types: [],
  };
}

export function amapPoiToPlace(poi) {
  if (!poi || !poi.location || poi.location.lng == null) return null;
  return {
    name: poi.name || '',
    vicinity: typeof poi.address === 'string' ? poi.address : '',
    amap_poi_id: poi.id || '',
    _gcj: { lat: Number(poi.location.lat), lng: Number(poi.location.lng) },
    types: poi.type ? String(poi.type).split(';') : [],
  };
}
